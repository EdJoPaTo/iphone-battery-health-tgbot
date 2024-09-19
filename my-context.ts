import type { Context as BaseContext, SessionFlavor } from "grammy";

export type Session = {
	page?: number;
};

export type State = {
	owner: string;
};

export type MyContext = BaseContext & SessionFlavor<Session> & { state: State };
