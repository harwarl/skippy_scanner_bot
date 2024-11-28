export const match = (a: string, b: string) => {
  if (a == null || a == undefined) return false;
  return a.toLowerCase() === b.toLowerCase();
};
