import { BadRequestException } from '@nestjs/common';

export function parseGraphqlId(value: string, fieldName: string): number {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new BadRequestException(`${fieldName} must be a positive integer identifier`);
  }

  return parsedValue;
}
