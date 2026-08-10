export async function EditMailbox(id, email, { name }) {
	await db.UpdateBy(
		{ id: id, "mailboxes.email": email },
		{ "mailboxes.$.name": name },
	)
}

export async function CreateMailbox(id, { email, name }) {
	await db.AddToArray({ id: id }, { mailboxes: { email, name } })
}

export async function DeleteMailbox(id, email) {
	await db.DeleteFromArrayBy({ id: id }, { mailboxes: { email: email } })
}
