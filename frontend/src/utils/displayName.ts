export function getDisplayUsername(username: string) {
  return username.replace(/_[a-z0-9]{4}$/i, "");
}