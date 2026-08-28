import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import { EmptyFileError, FileNotFoundError, FileTooLargeError } from "../application/errors";

export function handleFilesError(error: unknown): never {
  if (error instanceof FileNotFoundError) {
    throw new AppException("FILE_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof FileTooLargeError) {
    throw new AppException("FILE_TOO_LARGE", error.message, HttpStatus.BAD_REQUEST, {
      maxSizeBytes: error.maxSizeBytes,
    });
  }
  if (error instanceof EmptyFileError) {
    throw new AppException("EMPTY_FILE", error.message, HttpStatus.BAD_REQUEST);
  }
  throw error;
}
