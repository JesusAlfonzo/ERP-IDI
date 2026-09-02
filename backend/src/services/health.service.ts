export const checkSystemHealth = () => {
  return {
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Sistema en linea y operando correctamente',
  };
};
