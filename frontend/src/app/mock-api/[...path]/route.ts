import { handleMockRequest } from "@/mock/handlers";

type Context = { params: Promise<{ path: string[] }> };

const handle = async (req: Request, { params }: Context) => handleMockRequest(req, (await params).path);

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
