export const driverAccountSelect = {
  id: true,
  name: true,
  username: true,
  phone: true,
  status: true,
  mustChangePassword: true,
  temporaryPasswordHash: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

export function serializeDriverAccount(driver) {
  return {
    id: driver.id,
    name: driver.name,
    username: driver.username,
    phone: driver.phone,
    status: driver.status,
    mustChangePassword: driver.mustChangePassword,
    hasTemporaryPassword: Boolean(driver.temporaryPasswordHash),
    lastLoginAt: driver.lastLoginAt,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt,
  };
}
