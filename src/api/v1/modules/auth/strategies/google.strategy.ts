// import { OAuth2Client } from "google-auth-library";
// import jwt from "jsonwebtoken";
// import { env } from "@/config/env";
// import prisma from "@/utils/prismaClient";

// const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// export const GoogleAuthService = {
//   async verifyGoogleToken(idToken: string) {
//     const ticket = await client.verifyIdToken({
//       idToken,
//       audience: env.GOOGLE_CLIENT_ID,
//     });
//     const payload = ticket.getPayload();

//     if (!payload?.email) throw new Error("Invalid Google token");

//     let user = await prisma.user.findUnique({
//       where: { email: payload.email },
//     });

//     if (!user) {
//       user = await prisma.user.create({
//         data: {
//           email: payload.email,
//           name: payload.name || "Google User",
//           isVerified: true,
//           avatar: payload.picture
//             ? { create: { url: payload.picture } }
//             : undefined,
//         },
//         include: { avatar: true },
//       });
//     }

//     const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
//       expiresIn: env.JWT_EXPIRES_IN,
//     } as jwt.SignOptions);

//     return { user, token };
//   },
// };
