export class FileNotFoundError extends Error {
  constructor() {
    super("The file was not found.");
    this.name = "FileNotFoundError";
  }
}

export class FileTooLargeError extends Error {
  constructor(
    public readonly maxSizeBytes: number,
  ) {
    super(`File exceeds the maximum allowed size of ${maxSizeBytes} bytes.`);
    this.name = "FileTooLargeError";
  }
}

export class EmptyFileError extends Error {
  constructor() {
    super("An empty file cannot be uploaded.");
    this.name = "EmptyFileError";
  }
}
