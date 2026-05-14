export type Primitive = string | number | boolean | null;

export type NestedObject = {
	[key: string]: Primitive | NestedObject | Primitive[];
};
declare global {
	namespace Express {
		interface Request {
			userId?: string;
			accessToken?: string;
			tokenRefreshNeeded?: boolean;
			validatedQuery?: NestedObject;
		}
	}
}
