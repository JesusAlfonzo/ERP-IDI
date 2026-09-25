import jwt from 'jsonwebtoken';

/**
 * Genera un token JWT válido para pruebas de integración con rol ADMINISTRADOR
 */
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_default_secret_key';

/**
 * Genera un token JWT válido para pruebas de integración con rol ADMINISTRADOR
 */
export const getAdminAuthToken = (): string => {
  const payload = {
    id: 1,
    username: 'admin',
    email: 'admin@idi.ucv.ve',
    department: 'Sistemas',
    roles: ['ADMINISTRADOR'],
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Genera un token JWT para pruebas con roles específicos
 */
export const getAuthTokenForRoles = (roles: string[]): string => {
  const payload = {
    id: 99,
    username: 'testuser',
    email: 'testuser@idi.ucv.ve',
    department: 'Laboratorio',
    roles,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};
