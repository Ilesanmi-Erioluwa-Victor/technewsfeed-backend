import { Request } from "express";
import geoip from "geoip-lite"; 

export const getAuditContext = (req?: Request) => {
  if (!req) return {};

  const ipAddress = req.ip || req.socket?.remoteAddress || "Unknown";
  const userAgent = req.headers["user-agent"] || "Unknown";

  let location = "Unknown";
  if (ipAddress && ipAddress !== "Unknown") {
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      location = `${geo.city || ""}${geo.city && geo.country ? ", " : ""}${
        geo.country || ""
      }`;
    }
  }

  return {
    ipAddress,
    userAgent,
    sessionId: req.session?.id || (req.headers["x-session-id"] as string),
    location, 
    referrer: req.headers.referer || req.headers.referrer || "Direct",
    method: req.method,
    endpoint: req.originalUrl || req.url,
    timestamp: new Date(),
  };
};
