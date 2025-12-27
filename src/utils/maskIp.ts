export const maskIP = (ip: string): string => {
  if (ip === "Unknown") return ip;
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.x.x`;
    }
  }

  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:${parts[2]}::xxxx`;
    }
  }

  return ip;
};
