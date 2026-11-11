import path from "path";
import { fileURLToPath } from "url";

const defaultUploadsDirectory=fileURLToPath(new URL("../uploads/",import.meta.url))

export const uploadsDirectory=path.resolve(
    process.env.UPLOADS_DIR||defaultUploadsDirectory
)
