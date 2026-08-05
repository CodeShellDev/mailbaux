class MailboxAction {
	constructor({ html = "", className = "", events = [] }) {
		this.html = html
		this.parent = parent
		this.events = events
		this.className = className
	}

	render() {
		const wrapper = document.createElement("div")
		wrapper.className = this.className
		wrapper.innerHTML = this.html

		return wrapper
	}

	getEvents() {
		return this.events
	}

	getClassName() {
		return this.className
	}

	appendTo(parent) {
		if (this.html != "") {
			parent.appendChild(this.render())
		}
	}
}

class Mailbox {
	constructor({
		actions = [],
		hues = [10, 40, 60, 90, 120, 150, 180, 200, 220, 250, 280, 310, 340],
		name = "",
		email = "",
	}) {
		this.profilePictureHues = hues
		this.profileName = name
		this.profileEmail = email
		this.actions = actions
		this.mailboxes = []
		this.container = this.render()
	}

	getProfileColor(str) {
		let hash = 0
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash)
		}

		const hue =
			this.profilePictureHues[Math.abs(hash) % this.profilePictureHues.length]

		const saturation = 70
		const lightness = 60

		return `hsl(${hue}, ${saturation}%, ${lightness}%)`
	}

	render() {
		const wrapper = document.createElement("div")
		wrapper.className = "mailbox-item"
		wrapper.innerHTML = `
		<div class="mailbox-picture">
			${this.profileName.substring(0, 2).toUpperCase()}
		</div>
		<div class="mailbox-content">
			<p class="mailbox-user">
				${this.profileEmail.split("@")[0]}
			</p>
			<p class="mailbox-domain">
				${this.profileEmail.split("@")[1]}
			</p>
		</div>
		<div class="mailbox-actions"></div>
		`

		wrapper.querySelector(".mailbox-picture").style.backgroundColor =
			this.getProfileColor(this.profileName)

		const actionsContainer = wrapper.querySelector(".mailbox-actions")

		this.actions.forEach((action) => {
			action.appendTo(actionsContainer)
		})

		wrapper.dataset.email = this.profileEmail
		wrapper.dataset.name = this.profileName

		return wrapper
	}

	appendTo(parent) {
		parent.appendChild(this.container)
	}
}

class MailboxGrid {
	constructor({ endpoint, actions = [] }) {
		this.endpoint = endpoint
		this.mailboxes = []
		this.actions = actions
		this.container = null
	}

	async getMailboxes() {
		const response = await fetch(this.endpoint)

		const result = await response.json()

		return result
	}

	render() {
		const wrapper = document.querySelector(".mailbox-container")
		wrapper.innerHTML = ""

		this.mailboxes.forEach((mailbox) => {
			const mailboxWrapper = new Mailbox({
				actions: this.actions,
				name: mailbox.name,
				email: mailbox.email,
			})

			mailboxWrapper.appendTo(wrapper)
		})

		return wrapper
	}

	initEventhandlers() {
		let events = {}

		this.actions.forEach((action) => {
			action.getEvents().forEach((event) => {
				if (!Object.hasOwn(events, event.name)) {
					events[event.name] = {}
				}

				let className = action.getClassName()

				if (className == "") {
					className = "mailbox-item"
				}

				events[event.name][className] = {
					listener: event.listener,
				}
			})
		})

		for (const [eventName, eventValue] of Object.entries(events)) {
			this.container.addEventListener(eventName, (e) => {
				const element =
					e.target.closest(".mailbox-actions div") ||
					e.target.closest(".mailbox-item")

				if (!element) return

				if (!Object.hasOwn(eventValue, element.className)) return

				const listener = eventValue[element.className].listener

				const mailboxItem = element.closest(".mailbox-item")

				const email = mailboxItem.dataset.email
				const name = mailboxItem.dataset.name

				listener(element, {
					email: email,
					name: name,
				})
			})
		}
	}

	async create() {
		await this.update()

		this.initEventhandlers()
	}

	async update() {
		const mailboxes = await this.getMailboxes()

		if (JSON.stringify(this.mailboxes) !== JSON.stringify(mailboxes)) {
			this.mailboxes = mailboxes

			this.container = this.render()
		}
	}
}

export { MailboxGrid, MailboxAction, Mailbox }
