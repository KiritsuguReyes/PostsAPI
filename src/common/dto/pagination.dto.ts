import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({
    description: 'Número de página a obtener',
    example: 1,
    default: 1,
    minimum: 1,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Cantidad de registros por página',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Texto para buscar en título y contenido',
    example: 'Angular',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Campo por el cual ordenar los resultados',
    example: 'createdAt',
    default: 'createdAt',
    required: false
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Orden de los resultados',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
    required: false
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PaginatedResponse<T> {
  @ApiProperty({
    description: 'Datos obtenidos',
    isArray: true
  })
  data: T[];

  @ApiProperty({
    description: 'Información de paginación',
    example: {
      page: 1,
      limit: 10,
      total: 25,
      pages: 3,
      hasNextPage: true,
      hasPrevPage: false
    }
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
