class PopupMenu {
	constructor({
		title = "Settings",
		description = "",
		endpoint = "/",
		fields = [],
		onSubmit = null,
	}) {
		this.title = title
		this.description = description
		this.endpoint = endpoint
		this.fields = fields
		this.onSubmit = onSubmit
		this.container = this.render()
		this.overlay = this.renderOverlay()
	}

	render() {
		const wrapper = document.createElement("div")
		wrapper.className = "mailbox-popup-menu"

		const html = `
        <h3>${this.title}</h3>
		<p>${this.description}</p>
        <br />
        <form method="post" action="${this.endpoint}">
          ${this.fields.map((field) => this.renderField(field)).join("")}
        </form>
      	`

		wrapper.innerHTML = html
		wrapper.querySelector("form").style.display = "flex"
		wrapper.querySelector("form").style.flexDirection = "row"
		wrapper.querySelector("form").style.justifyContent = "center"
		wrapper.querySelector("form").style.alignItems = "center"
		wrapper.querySelector("form").style.gap = "10px"

		wrapper.querySelector("form").addEventListener("submit", async (e) => {
			e.preventDefault()

			const data = Object.fromEntries(new FormData(e.target).entries())

			const response = await fetch(this.endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			})

			if (response.status === 200) {
				if (this.onSubmit) {
					this.onSubmit()
				}

				this.close()
			}
		})

		return wrapper
	}

	renderOverlay() {
		const wrapper = document.createElement("div")
		wrapper.className = "overlay"

		wrapper.addEventListener("click", (e) => {
			if (e.target === wrapper) this.close()
		})

		return wrapper
	}

	renderField({
		label = null,
		name = "",
		type = "text",
		value = "",
		placeholder = "",
		pattern = ".*",
		required = false,
		...custom
	}) {
		const dataAttributes = Object.entries(custom)
			.map(([key, value]) => `data-${key}="${value}"`)
			.join(" ")

		let res = `
        <input 
            type="${type}" 
            name="${name}" 
            id="${name}" 
            value="${value}" 
            placeholder="${placeholder}" 
            pattern="${pattern}" 
            ${required ? "required" : ""}
			${dataAttributes}
        />
    `

		return res
	}

	open(overwrites = []) {
		const fields = this.fields

		overwrites.forEach((overwrite) => {
			for (let fieldI = 0; fieldI < fields.length; fieldI++) {
				const field = fields[fieldI]

				if (field.name === overwrite.name) {
					for (const [_k, _v] of Object.entries(field)) {
						for (const [key, value] of Object.entries(overwrite)) {
							this.fields[fieldI][key] = value
						}
					}
				}
			}
		})

		this.container = this.render()

		document.body.appendChild(this.overlay)

		document.body.appendChild(this.container)

		this.fields = fields
	}

	close() {
		this.overlay.remove()

		this.container.remove()
	}
}

class Menu {
	constructor({
		title = "Settings",
		endpoint = "/",
		fields = [],
		onSubmit = null,
	}) {
		this.title = title
		this.endpoint = endpoint
		this.fields = fields
		this.onSubmit = onSubmit
		this.container = this.render()
		this.overlay = this.renderOverlay()
	}

	render() {
		const wrapper = document.createElement("div")
		wrapper.className = "mailbox-menu"

		const html = `
        <h3>${this.title}</h3>
        <hr /><br />
        <form method="post" action="${this.endpoint}">
          ${this.fields.map((field) => this.renderField(field)).join("<br />")}
          <hr /><br />
          <input type="submit" value="Submit" />
        </form>
      	`

		wrapper.innerHTML = html

		wrapper.querySelector("form").addEventListener("submit", async (e) => {
			e.preventDefault()

			const data = Object.fromEntries(new FormData(e.target).entries())

			const response = await fetch(this.endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			})

			if (response.status === 200) {
				if (this.onSubmit) {
					this.onSubmit()
				}

				this.close()
			}
		})

		return wrapper
	}

	renderOverlay() {
		const wrapper = document.createElement("div")
		wrapper.className = "overlay"

		wrapper.addEventListener("click", (e) => {
			if (e.target === wrapper) this.close()
		})

		return wrapper
	}

	renderField({
		label = null,
		name = "",
		type = "text",
		value = "",
		placeholder = "",
		pattern = ".*",
		required = true,
		...custom
	}) {
		const dataAttributes = Object.entries(custom)
			.map(([key, value]) => `data-${key}="${value}"`)
			.join(" ")

		let res = `
        <input 
            type="${type}" 
            name="${name}" 
            id="${name}" 
            value="${value}" 
            placeholder="${placeholder}" 
            pattern="${pattern}" 
            ${required ? "required" : ""}
			${dataAttributes}
        />
    `

		if (label) {
			res = `
            ${label}
            ${res}
        `
		}

		return res
	}

	open(overwrites = []) {
		const fields = this.fields

		overwrites.forEach((overwrite) => {
			for (let fieldI = 0; fieldI < fields.length; fieldI++) {
				const field = fields[fieldI]

				if (field.name === overwrite.name) {
					for (const [_k, _v] of Object.entries(field)) {
						for (const [key, value] of Object.entries(overwrite)) {
							this.fields[fieldI][key] = value
						}
					}
				}
			}
		})

		this.container = this.render()

		document.body.appendChild(this.overlay)

		document.body.appendChild(this.container)

		this.fields = fields
	}

	close() {
		this.overlay.remove()

		this.container.remove()
	}
}

export { Menu, PopupMenu }
