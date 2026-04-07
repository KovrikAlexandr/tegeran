export class HealthResponseDto {
  status!: 'ok';

  static ok(): HealthResponseDto {
    return { status: 'ok' };
  }
}
