export const classifyContent = (content: string, title: string): string => {
  const text = (title + " " + content).toLowerCase();

  if (
    text.includes("ai") ||
    text.includes("machine learning") ||
    text.includes("neural")
  ) {
    return "Artificial Intelligence";
  } else if (
    text.includes("cloud") ||
    text.includes("aws") ||
    text.includes("azure") ||
    text.includes("gcp")
  ) {
    return "Cloud Computing";
  } else if (
    text.includes("security") ||
    text.includes("cyber") ||
    text.includes("hack")
  ) {
    return "Security";
  } else if (
    text.includes("web") ||
    text.includes("frontend") ||
    text.includes("javascript")
  ) {
    return "Web Development";
  } else if (
    text.includes("database") ||
    text.includes("sql") ||
    text.includes("nosql")
  ) {
    return "Databases";
  } else if (
    text.includes("devops") ||
    text.includes("kubernetes") ||
    text.includes("docker")
  ) {
    return "DevOps";
  } else {
    return "Technology";
  }
};
