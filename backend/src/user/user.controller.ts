import { Request, Response, NextFunction } from "express";
import { db } from "../db/db_index";
import {
  usersTable,
  userInfoTable,
  userRolesTable,
  roleInfoTable,
  notifCredsTable,
} from "../db/schema";
import bcrypt from "bcryptjs";
import { eq, and, or, inArray, ne } from "drizzle-orm";
import { ApiError } from "../lib/api-error";
import jwt from "jsonwebtoken";
import { ROLE_NAMES, defaultRole } from "../lib/roles-manager";
import { imageUploadS3 } from "../lib/s3-client";
import { otpSenderAuthToken } from "../lib/env-exporter";
import { setOtpCreds, verifyOtpCreds } from "../lib/otp-utils";

/**
 * Register a new user
 */
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, email, mobile, address, password, role, username } = req.body;
  // Parse and log profilePic
  let profilePicUrl = null;
  if (req.file) {
    // Upload to S3 using buffer
    const key = `profile-pics/${Date.now()}_${req.file.originalname}`;
    profilePicUrl = await imageUploadS3(
      req.file.buffer,
      req.file.mimetype,
      key
    );
  }

  // Validate required fields
  if (!name || !email || !mobile || !password) {
    throw new ApiError("Missing required fields", 400);
  }

  // Check if user with the same email, mobile, or username already exists
  const existingUser = await db.query.usersTable.findFirst({
    where: (users) => {
      return or(
        eq(users.email, email),
        eq(users.mobile, mobile),
        username ? eq(users.username, username) : undefined
      );
    },
  });

  if (existingUser) {
    throw new ApiError(
      "User with this email, mobile, or username already exists",
      409
    );
  }

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Start a transaction
  return await db.transaction(async (tx) => {
    // Create a new user
    const [newUser] = await tx
      .insert(usersTable)
      .values({
        name,
        email,
        mobile,
        address,
        username: username,
        joinDate: new Date().toISOString(),
        profilePicUrl, // Save the profilePic URL in the user table
      })
      .returning();

    if (!newUser) {
      throw new Error("Failed to create user");
    }

    // Create user info with password
    await tx.insert(userInfoTable).values({
      userId: newUser.id,
      password: hashedPassword,
      isSuspended: false,
      activeTokenVersion: 1,
    });

    // Assign role - use specified role or default to GENERAL_USER if not provided
    const roleToAssign = role || defaultRole;

    const roleInfo = await tx.query.roleInfoTable.findFirst({
      where: (roles) => eq(roles.name, roleToAssign),
    });

    if (roleInfo) {
      await tx.insert(userRolesTable).values({
        userId: newUser.id,
        roleId: roleInfo.id,
        addDate: new Date().toISOString(),
      });
    }

    // Return user data
    return res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        profilePicUrl: newUser.profilePicUrl, // Include profilePic URL in the response
      },
      message: "User created successfully",
    });
  });
};

/**
 * Login a user
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { login, password, useUsername, expoPushToken } = req.body;

  // Validate required fields
  if (!login || !password) {
    throw new ApiError("Missing credentials", 400);
  }

  // Find user based on login method
  let user;
  if (useUsername) {
    // If useUsername flag is set, only check username
    user = await db.query.usersTable.findFirst({
      where: (users) => eq(users.username, login),
      with: {
        userInfo: true,
      },
    });
  } else {
    // Mobile number login
    user = await db.query.usersTable.findFirst({
      where: (users) => eq(users.mobile, login),
      with: {
        userInfo: true,
      },
    });
  }

  if (!user || !user.userInfo) {
    throw new ApiError(
      useUsername
        ? "Invalid username or password"
        : "Invalid mobile number or password",
      401
    );
  }

  // Check if user is suspended
  if (user.userInfo.isSuspended) {
    throw new ApiError("Account has been suspended", 403);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(
    password,
    user.userInfo.password
  );
  if (!isPasswordValid) {
    throw new ApiError("Invalid credentials", 401);
  }

  // Get user roles
  // Since we don't have the proper relations set up yet for roles,
  // we'll query the role information directly
  const userRolesData = await db
    .select({
      roleId: userRolesTable.roleId,
    })
    .from(userRolesTable)
    .where(eq(userRolesTable.userId, user.id));

  const roleIds = userRolesData.map((ur) => ur.roleId);

  const roles = await getUserRoles(user.id)

  // Generate JWT token
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    mobile: user.mobile,
    roles,
    tokenVersion: user.userInfo.activeTokenVersion,
  };

  // Sign token with secret key and set expiration
  const token = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "30d" }
  );

  await savePushToken(user.id, expoPushToken);

  // Prepare response object
  const responseObj = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      roles,
    },
    token,
    message: "Login successful",
  };

  // Return user data with token
  return res.status(200).json(responseObj);
};

async function savePushToken(userId: number, pushToken: string) {
  if (!pushToken) return;

  // Check if a record exists for this userId
  const existing = await db.query.notifCredsTable.findFirst({
    where: eq(notifCredsTable.userId, userId),
  });
  if (existing) {
    // Update the pushToken
    await db
      .update(notifCredsTable)
      .set({ pushToken, addedOn: new Date() })
      .where(eq(notifCredsTable.userId, userId));
  } else {
    // Insert new record
    await db.insert(notifCredsTable).values({ userId, pushToken });
  }
}

/**
 * Get user by ID
 * @description Retrieves user information including role and specializations if user is a doctor
 */
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    throw new ApiError("Invalid user ID", 400);
  }

  // Get user with roles
  const user = await db.query.usersTable.findFirst({
    where: (users) => eq(users.id, userId),
    with: {
      roles: {
        with: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Extract role names
  const roleNames = user.roles.map((r) => r.role.name);

  // Generate signed URL for profilePic if present
  let signedProfilePicUrl = null;
  if (user.profilePicUrl) {
    const { generateSignedUrlFromS3Url } = await import("../lib/s3-client");
    signedProfilePicUrl = await generateSignedUrlFromS3Url(user.profilePicUrl);
  }

  // Format base user response
  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    username: user.username,
    address: user.address,
    profilePicUrl: signedProfilePicUrl,
    joinDate: user.joinDate,
    role: roleNames[0], // Primary role
    roles: roleNames,
  };

  // Return basic user info if not a doctor or no doctor info found
  return res.status(200).json(userResponse);
};

/**
 * Update user information
 * @description Updates user's basic information and doctor-specific details if applicable
 */
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = parseInt(req.params.userId);
    const { name, email, mobile, address, profilePicUrl, password } = req.body;

    if (isNaN(userId)) {
      throw new ApiError("Invalid user ID", 400);
    }

    // Verify user exists
    const existingUser = await db.query.usersTable.findFirst({
      where: (users) => eq(users.id, userId),
      with: {
        roles: {
          with: {
            role: true,
          },
        },
        userInfo: true,
      },
    });

    if (!existingUser) {
      throw new ApiError("User not found", 404);
    }

    // Check if user is trying to update to an email or mobile that already exists
    // Only perform this check if email or mobile are being updated to different values
    const emailChanged =
      email !== undefined && email !== null && email !== existingUser.email;
    const mobileChanged =
      mobile !== undefined && mobile !== null && mobile !== existingUser.mobile;

    if (emailChanged || mobileChanged) {
      // Build query conditions for checking conflicts
      const conflictConditions: any[] = [];

      if (emailChanged) {
        conflictConditions.push(eq(usersTable.email, email));
      }

      if (mobileChanged) {
        conflictConditions.push(eq(usersTable.mobile, mobile));
      }

      // Check for conflicts with other users
      if (conflictConditions.length > 0) {
        const conflictingUser = await db.query.usersTable.findFirst({
          where: (users) => {
            return and(
              ne(users.id, userId),
              conflictConditions.length > 1
                ? or(...conflictConditions)
                : conflictConditions[0]
            );
          },
        });

        if (conflictingUser) {
          throw new ApiError("Email or mobile number already in use", 409);
        }
      }
    }

    // Start transaction
    return await db.transaction(async (tx) => {
      // Prepare update object with only provided fields
      const updateData: Record<string, any> = {};

      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (mobile) updateData.mobile = mobile;
      if (address !== undefined) updateData.address = address;
      if (profilePicUrl) updateData.profilePicUrl = profilePicUrl;

      // Update password if provided
      if (password) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await tx
          .update(userInfoTable)
          .set({
            password: hashedPassword,
            // Increment token version to invalidate existing tokens
            activeTokenVersion: existingUser.userInfo?.activeTokenVersion
              ? existingUser.userInfo.activeTokenVersion + 1
              : 1,
          })
          .where(eq(userInfoTable.userId, userId));
      }

      // Handle profilePic upload
      if (req.file) {
        
        updateData.profilePicUrl = await imageUploadS3(
          req.file.buffer,
          req.file.mimetype,
          `profile-pics/${Date.now()}_${req.file.originalname}`
        );
      }

      // Update user in the database
      await tx
        .update(usersTable)
        .set(updateData)
        .where(eq(usersTable.id, userId));

      // Fetch updated user data
      const updatedUser = await getUserData(tx, userId);

      return res.status(200).json({
        ...updatedUser,
        message: "User updated successfully",
      });
    });
  } catch (error) {
    console.error("Update user error:", error);
    next(
      error instanceof ApiError
        ? error
        : new ApiError("Failed to update user", 500)
    );
  }
};

/**
 * Helper function to get complete user data including role and specializations
 */
async function getUserData(db: any, userId: number) {
  // Get user with roles
  const user = await db.query.usersTable.findFirst({
    where: (users: any) => eq(users.id, userId),
    with: {
      roles: {
        with: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Extract role names
  const roleNames = user.roles.map((r: any) => r.role.name);

  // Format base user response
  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    username: user.username,
    address: user.address,
    profilePicUrl: user.profilePicUrl,
    joinDate: user.joinDate,
    role: roleNames[0], // Primary role
    roles: roleNames,
  };

  // Return basic user info if not a doctor or no doctor info found
  return userResponse;
}

// Check if user's push token exists in notif_creds table
export const hasPushToken = async (req: Request, res: Response) => {
  let currUser = req.user;
  if (!currUser) throw new ApiError("User Not Found");

  const record = await db.query.notifCredsTable.findFirst({
    where: eq(notifCredsTable.userId, currUser.id),
    columns: { pushToken: true },
  });
  res.json({ hasPushToken: !!(record && record.pushToken) });
};

// Add or update user's push token in notif_creeds table
export const addPushToken = async (req: Request, res: Response) => {
  const { pushToken } = req.body;
  if (!pushToken) {
    throw new ApiError("Push token is required", 400);
  }
  const currUser = req.user;
  if (!currUser) {
    throw new ApiError("Unauthorized request", 401);
  }
  await savePushToken(currUser.id, pushToken);
  res.json({ message: "Push token saved successfully" });
};

export const sendOtp = async (req: Request, res: Response) => {
  const phone = req.params.phone;
  if (!phone) {
    throw new ApiError("Phone number is required", 400);
  }
  const reqUrl = `https://cpaas.messagecentral.com/verification/v3/send?countryCode=91&flowType=SMS&mobileNumber=${phone}&timeout=300`;
  const resp = await fetch(reqUrl, {
    headers: {
      authToken: otpSenderAuthToken,
    },
    method: "POST",
  });
  const data = await resp.json();

  if (data.message === "SUCCESS") {
    setOtpCreds(phone, data.data.verificationId);
    res.status(200).json({ message: "otp Sent Successfully" });
    return;
  }
  if (data.message === "REQUEST_ALREADY_EXISTS") {
    res
      .status(200)
      .json({ message: "OTP already sent. Last OTP is still valid" });
    return;
  }

  res.status(500).json({ message: "error while sending OTP. Plz try again" });
};

export const verifyOtp = async (req: Request, res: Response) => {
  // const body = await request.json();
  const { phone, otp } = req.body;

  const verification = await verifyOtpCreds(phone, otp);
  if (verification) {
    res.status(200).json({ message: "OTP verified successfully" });
    return;
  }
  res.status(401).json({ message: "Invalid OTP. Plz Try again" });
};

export const loginOtp = async (req: Request, res: Response) => {
  const { mobile, otp, pushToken } = req.body;
  if (!mobile || !otp) {
    throw new ApiError("Mobile and OTP are required", 400);
  }
  // Verify OTP (reuse logic from verifyOtp)
  const verification = await verifyOtpCreds(mobile, otp);
  if (!verification) {
    throw new ApiError("Invalid OTP. Please try again", 401);
  }
  // Find user by mobile
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.mobile, mobile),
    with: {
      userInfo: true, // Need userInfo for token generation
      roles: {
        with: {
          role: true,
        },
      },
    },
  });
  if (!user) {
    throw new ApiError("User not found", 404);
  }
  if (user.userInfo?.isSuspended) {
    throw new ApiError("User is suspended", 403);
  }

  // Get user roles
  const roles = await getUserRoles(user.id);

  // Generate JWT token
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    mobile: user.mobile,
    roles,
    tokenVersion: user.userInfo!.activeTokenVersion,
  };

  // Sign token with secret key and set expiration
  const token = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "30d" }
  );

  if (pushToken) {
    await savePushToken(user.id, pushToken);
  }

  // Prepare response object matching login method structure
  const responseObj = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      roles,
    },
    token,
    message: "Login successful",
  };

  res.json(responseObj);
};

// Google authentication controller
export const googleAuth = async (req: Request, res: Response) => {
  const { idToken, serverAuthCode, user: googleUser, mobile, expoPushToken } = req.body;

  console.log({expoPushToken})
  
  // Validate required fields
  if (!idToken || !googleUser) {
    throw new ApiError("Missing required fields: idToken or user", 400);
  }

  // Check if user with the same email already exists
  const existingUser = await db.query.usersTable.findFirst({
    where: (users) => eq(users.email, googleUser.email),
    with: {
      userInfo: true
    }
  });

  // Check if user with the same mobile already exists (if mobile is provided)
  if (mobile) {
    if (!/^\d{10,15}$/.test(mobile)) {
      throw new ApiError("Invalid mobile number format", 400);
    }
    
    const existingUserWithMobile = await db.query.usersTable.findFirst({
      where: (users) => eq(users.mobile, mobile),
    });

    if (existingUserWithMobile && existingUserWithMobile.email !== googleUser.email) {
      throw new ApiError("Mobile number is already linked with another account. You can login with OTP also.", 409);
    }
  }

  // If user doesn't exist and we don't have a mobile number, ask for mobile
  if (!existingUser && !mobile) {
    // Return a response asking for mobile number
    await savePushToken(googleUser.id, expoPushToken)
    return res.status(200).json({
      requiresMobile: true,
      message: "Please provide a mobile number to complete registration",
      user: {
        id: googleUser.id,
        name: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email,
        profilePicUrl: googleUser.photo,
      }
    });
  }

  // If user doesn't exist but we have mobile, create a new user
  if (!existingUser && mobile) {
    let profilePicUrl = null;

    // Download and upload profile picture to S3 if provided
    if (googleUser.photo) {
      try {
        const response = await fetch(googleUser.photo);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Determine file extension from the URL or default to jpg
          const url = new URL(googleUser.photo);
          const pathname = url.pathname;
          let ext = pathname.split('.').pop();
          if (!ext || !['jpg', 'jpeg', 'png', 'gif'].includes(ext.toLowerCase())) {
            ext = 'jpg'; // default
          }
          
          const key = `profile-pics/${Date.now()}_${googleUser.email}.${ext}`;
          profilePicUrl = await imageUploadS3(
            buffer,
            `image/${ext}`,
            key
          );
        }
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        // Continue without profile picture if upload fails
      }
    }

    const transactionResult = await db.transaction(async (tx) => {
      // Create a new user
      const [newUser] = await tx
        .insert(usersTable)
        .values({
          name: capitalizeName(googleUser.name) || capitalizeName(googleUser.email.split('@')[0]) || '',
          email: googleUser.email,
          mobile: mobile,
          profilePicUrl: profilePicUrl,
          joinDate: new Date().toISOString()
        })
        .returning();

      if (!newUser) {
        throw new Error("Failed to create user");
      }

      // Create user info (no password for Google auth)
      await tx.insert(userInfoTable).values({
        userId: newUser.id,
        password: "", // No password for Google auth
        isSuspended: false,
        activeTokenVersion: 1,
      });

      // Assign default role
      const roleInfo = await tx.query.roleInfoTable.findFirst({
        where: (roles) => eq(roles.name, defaultRole),
      });

      if (roleInfo) {
        await tx.insert(userRolesTable).values({
          userId: newUser.id,
          roleId: roleInfo.id,
          addDate: new Date().toISOString(),
        });
      }

      return newUser;
    });

    // Get user roles for the new user
    const roles = await getUserRoles(transactionResult.id);

    // Generate JWT token
    const tokenPayload = {
      userId: transactionResult.id,
      email: transactionResult.email,
      mobile: transactionResult.mobile,
      roles,
      tokenVersion: 1, // New user, so token version is 1
    };

    // Sign token with secret key and set expiration
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "30d" }
    );

    // Prepare response object
    const responseObj = {
      user: {
        id: transactionResult.id,
        name: transactionResult.name,
        email: transactionResult.email,
        mobile: transactionResult.mobile,
        profilePicUrl: transactionResult.profilePicUrl,
        roles,
      },
      token,
      message: "User created and logged in successfully",
    };

    await savePushToken(transactionResult.id, expoPushToken)

    return res.status(200).json(responseObj);
  }

  // If user exists, return the existing user
  if (existingUser) {
    // Get user roles
    const roles = await getUserRoles(existingUser.id);

    // Generate JWT token
    const tokenPayload = {
      userId: existingUser.id,
      email: existingUser.email,
      mobile: existingUser.mobile,
      roles,
      tokenVersion: existingUser.userInfo!.activeTokenVersion,
    };

    // Sign token with secret key and set expiration
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "30d" }
    );

    await savePushToken(existingUser.id, expoPushToken)
    // Prepare response object
    const responseObj = {
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        mobile: existingUser.mobile,
        profilePicUrl: existingUser.profilePicUrl,
        roles,
      },
      token,
      message: "User logged in successfully",
    };

    return res.status(200).json(responseObj);
  }
};

function capitalizeName(name: string | null | undefined): string | null {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

async function getUserRoles(id: number) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, id),
    with: {
      roles: {
        with: {
          role: true,
        },
      },
    },
  });
  return user?.roles.map(role => role.role.name);
}
