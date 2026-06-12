export function getAsciiSum(str: string): number {
  return str?.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) ?? 0;
}
