import { TokenPayload } from '@shared/util/parseAccessToken';
import { jwtDecode } from 'jwt-decode';

export const parseAccessToken = (token: string | null) => {
	if (!token) throw new Error('expected a token');

	return jwtDecode<TokenPayload>(token);
};
