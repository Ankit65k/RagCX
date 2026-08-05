import { Response } from 'express';

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export class ApiResponse {
  public static success<T>(
    res: Response,
    data: T,
    message = 'Request completed successfully',
    statusCode = 200,
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  public static created<T>(
    res: Response,
    data: T,
    message = 'Resource created successfully',
  ): Response {
    return this.success(res, data, message, 201);
  }

  public static paginate<T>(
    res: Response,
    items: T[],
    meta: PaginationMeta,
    message = 'Paginated resources retrieved successfully',
  ): Response {
    return res.status(200).json({
      success: true,
      message,
      data: {
        items,
        meta,
      },
    });
  }
}

export default ApiResponse;
