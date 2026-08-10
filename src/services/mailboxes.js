import { AddToArray, DeleteFromArrayBy, UpdateBy } from "#utils/db"

export async function EditMailbox(id, email, { name }) {
	await UpdateBy(
		{ id: id, "mailboxes.email": email },
		{ "mailboxes.$.name": name },
	)
}

export async function CreateMailbox(id, { email, name }) {
	await AddToArray({ id: id }, { mailboxes: { email, name } })
}

export async function DeleteMailbox(id, email) {
	await DeleteFromArrayBy({ id: id }, { mailboxes: { email: email } })
}
