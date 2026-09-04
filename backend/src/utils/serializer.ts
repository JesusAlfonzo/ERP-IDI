export function serializeBigInt<T>(data: T): T {
  if (data === undefined || data === null) {
    return data;
  }
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}
