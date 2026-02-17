import { IsString, IsOptional, IsBoolean, IsNumber, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSriConfigDto {
  @ApiProperty() @IsString() ruc: string;
  @ApiProperty() @IsString() razonSocial: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nombreComercial?: string;
  @ApiProperty() @IsString() direccionMatriz: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() obligadoContabilidad?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() contribuyenteEspecial?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() regimenRimpe?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() ambiente?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() establecimiento?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() puntoEmision?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emailNotificacion?: string;
  // SMTP
  @ApiPropertyOptional() @IsOptional() @IsString() smtpHost?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() smtpPort?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() smtpUser?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() smtpPassword?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() smtpFromName?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() smtpSecure?: boolean;
}

export class EmitirFacturaDto {
  @ApiProperty() @IsString() orderId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tipoIdentificacion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() identificacion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() razonSocial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() direccion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() telefono?: string;
}

export class EmitirNotaCreditoDto {
  @ApiProperty({ description: 'ID de la factura autorizada a la que se aplica la NC' })
  @IsString() facturaId: string;

  @ApiProperty({ description: 'Motivo de la nota de crédito' })
  @IsString() motivo: string;

  @ApiPropertyOptional({ description: 'Si es parcial, IDs de items a incluir (vacío = total)' })
  @IsOptional() @IsString({ each: true }) itemIds?: string[];
}

export class AnularComprobanteDto {
  @ApiProperty({ description: 'Motivo de la anulación' })
  @IsString() motivo: string;
}

export class EnviarEmailDto {
  @ApiProperty({ description: 'Email del destinatario' })
  @IsString() email: string;
}
