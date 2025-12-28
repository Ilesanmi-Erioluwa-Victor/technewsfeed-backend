import { Request } from "express";
import geoip from "geoip-lite";

export const getAuditContext = (req?: Request) => {
  const defaultContext = {
    ipAddress: "Unknown",
    userAgent: "Unknown",
    sessionId: "Unknown",
    metadata: {},
  };

  if (!req) return defaultContext;

  const ipAddress = req.ip || req.socket?.remoteAddress || "Unknown";
  const userAgent = req.headers["user-agent"] || "Unknown";

  const realIp =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] || ipAddress;

  let location = "Unknown";
  if (realIp && realIp !== "Unknown") {
    const geo = geoip.lookup(realIp);
    if (geo) {
      location = `${geo.city || ""}${geo.city && geo.country ? ", " : ""}${
        geo.country || ""
      }`;
    }
  }

  return {
    ipAddress: realIp,
    userAgent,
    sessionId:
      req.session?.id || (req.headers["x-session-id"] as string) || "Unknown",
    metadata: {
      location,
      referrer: req.headers.referer || req.headers.referrer || "Direct",
      method: req.method,
      endpoint: req.originalUrl || req.url,
    },
  };
};
