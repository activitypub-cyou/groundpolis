import * as mongo from 'mongodb';
import { IRemoteUser } from '../../../../models/user';
import { ILike } from '../../type';
import Note from '../../../../models/note';
import deleteReaction from '../../../../services/note/reaction/delete';
import { isSelfHost, extractApHost } from '../../../../misc/convert-host';
import { apLogger } from '../../logger';

/**
 * Process Undo.Like activity
 */
export default async (actor: IRemoteUser, activity: ILike): Promise<void> => {
	const id = typeof activity.object == 'string' ? activity.object : activity.object.id;

	if (!isSelfHost(extractApHost(id))) {
		apLogger.warn(`skip Undo Like to foregin host (${id})`);
		return;
	}
	const noteId = new mongo.ObjectID(id.split('/').pop());

	const note = await Note.findOne({ _id: noteId });
	if (note === null) {
		throw 'note not found';
	}

	await deleteReaction(actor, note);
};
