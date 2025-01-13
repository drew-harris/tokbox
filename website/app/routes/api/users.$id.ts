import { json } from "@tanstack/start";
import { createAPIFileRoute } from "@tanstack/start/api";

export const APIRoute = createAPIFileRoute("/api/users/$id")({
  GET: async ({ request, params }) => {
    return json({
      test: "test",
    });
  },
});
