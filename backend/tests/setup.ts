import jwt from 'jsonwebtoken';

/**
 * Genera un token JWT válido para pruebas de integración con rol ADMINISTRADOR
 */
export const getAdminAuthToken = (): string => {
  const secret = process.env.JWT_SECRET || 'secret';

  const payload = {
    id: 1,
    username: 'admin',
    email: 'admin@idi.ucv.ve',
    department: 'Sistemas',
    roles: ['ADMINISTRADOR'],
  };

  return jwt.sign(payload, secret, { expiresIn: '1h' });
};
