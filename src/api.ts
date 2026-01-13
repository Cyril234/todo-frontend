import type { ToDoDto, UserDto } from "./types";


const BASE_URL = "https://todo-list-backend-webapp.azurewebsites.net/";


class ApiError extends Error {
status: number;
details?: unknown;


constructor(message: string, status: number, details?: unknown) {
super(message);
this.name = "ApiError";
this.status = status;
this.details = details;
}
}


async function safeJson(res: Response) {
const text = await res.text();
if (!text) return undefined;
try {
return JSON.parse(text);
} catch {
return text;
}
}
async function request<T>(path: string, init?: RequestInit, expectedStatus?: number): Promise<T> {
const res = await fetch(`${BASE_URL}${path}`, {
...init,
headers: {
"Content-Type": "application/json",
...(init?.headers ?? {}),
},
});


// Status prüfen
if (expectedStatus != null && res.status !== expectedStatus) {
const body = await safeJson(res);
throw new ApiError(
`Unerwarteter Status: ${res.status} (erwartet ${expectedStatus})`,
res.status,
body
);
}


// generelles Error-Handling
if (!res.ok) {
const body = await safeJson(res);
const msg =
(body && typeof body === "object" && "message" in (body as any) && String((body as any).message)) ||
`HTTP Fehler ${res.status}`;
throw new ApiError(msg, res.status, body);
}


// No content
if (res.status === 204) {
return undefined as T;
}


// JSON
const data = (await safeJson(res)) as T;
return data;
}


export const api = {
// POST /users { password }
async login(password: string): Promise<UserDto> {
return request<UserDto>(
`/users`,
{
method: "POST",
body: JSON.stringify({ password }),
},
201
);
},
// GET /users/{userId}/todos
async getTodos(userId: number): Promise<ToDoDto[]> {
return request<ToDoDto[]>(`/users/${userId}/todos`, { method: "GET" }, 200);
},


// POST /users/{userId}/todos { text }
async createTodo(userId: number, text: string): Promise<ToDoDto> {
return request<ToDoDto>(
`/users/${userId}/todos`,
{
method: "POST",
body: JSON.stringify({ text }),
},
201
);
},


// PUT /todos/{todoId} { tickedOff }
async updateTodo(todoId: number, tickedOff: boolean): Promise<ToDoDto> {
return request<ToDoDto>(
`/todos/${todoId}`,
{
method: "PUT",
body: JSON.stringify({ tickedOff }),
},
200
);
},


// DELETE /todos/{todoId}
async deleteTodo(todoId: number): Promise<void> {
return request<void>(`/todos/${todoId}`, { method: "DELETE" }, 204);
},


ApiError,
};