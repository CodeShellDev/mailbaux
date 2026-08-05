class PopupMenu {
	constructor({
		title = "",
		description = "",
		endpoint = "/",
		fields = [],
		actions = [],
		onSubmit = null,
	}) {
		this.title = title
		this.description = description
		this.endpoint = endpoint
		this.fields = fields
		this.actions = actions
		this.onSubmit = onSubmit
		this.container = this.render()
		this.overlay = null
	}

	render() {
		const wrapper = document.createElement("div")
		wrapper.className = "popup-menu"

		const html = `
        <h3>${this.title}</h3>
		<p>${this.description}</p>
        <br />
        <form method="post" action="${this.endpoint}">
        	${this.fields.map((field) => this.renderField(field)).join("")}
			<div class="form-actions">
          		${this.actions.map((actions) => this.renderAction(actions)).join("")}
		  	</div>
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

	renderAction({ label = null, name = "", ...custom }) {
		const dataAttributes = Object.entries(custom)
			.map(([key, value]) => `data-${key}="${value}"`)
			.join(" ")

		return `
			<div class="form-action">
				<input 
					type="submit"
					name="${name}" 
					id="${name}"
					value="${label ?? ""}"
					${dataAttributes}
				/>
			</div>
		`
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

		return `
			<div class="form-field">
				${label ? `<label for="${name}">${label}</label>` : ""}
				<input 
					type="${type}" 
					name="${name}" 
					id="${name}"
					value="${value ?? ""}"
					placeholder="${placeholder}"
					pattern="${pattern}"
					${required ? "required" : ""}
					${dataAttributes}
				/>
			</div>
		`
	}

	open(overwrites = []) {
		const fields = structuredClone(this.fields)

		overwrites.forEach((overwrite) => {
			for (let fieldI = 0; fieldI < fields.length; fieldI++) {
				const field = fields[fieldI]

				if (field.name === overwrite.name) {
					for (const [key, value] of Object.entries(overwrite)) {
						fields[fieldI][key] = value
					}
				}
			}
		})

		this.fields = fields

		this.container = this.render()
		this.overlay = this.renderOverlay()

		document.body.appendChild(this.overlay)
		document.body.appendChild(this.container)
	}

	close() {
		this.overlay.remove()

		this.container.remove()
	}
}

class Menu {
	constructor({
		title = "",
		endpoint = "/",
		fields = [],
		actions = [{ label: "Submit", name: "submit" }],
		onSubmit = null,
	}) {
		this.title = title
		this.endpoint = endpoint
		this.fields = fields
		this.actions = actions
		this.onSubmit = onSubmit
		this.container = this.render()
		this.overlay = null
	}

	render() {
		const wrapper = document.createElement("div")
		wrapper.className = "menu"

		const html = `
        <h3>${this.title}</h3>
        <hr /><br />
        <form method="post" action="${this.endpoint}">
        	${this.fields.map((field) => this.renderField(field)).join("")}
			<div class="form-actions">
          		${this.actions.map((actions) => this.renderAction(actions)).join("")}
		  	</div>
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

	renderAction({ label = null, name = "", ...custom }) {
		const dataAttributes = Object.entries(custom)
			.map(([key, value]) => `data-${key}="${value}"`)
			.join(" ")

		return `
			<div class="form-action">
				<input 
					type="submit"
					name="${name}" 
					id="${name}"
					value="${label ?? ""}"
					${dataAttributes}
				/>
			</div>
		`
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

		return `
			<div class="form-field">
				${label ? `<label for="${name}">${label}</label>` : ""}
				<input 
					type="${type}" 
					name="${name}" 
					id="${name}"
					value="${value ?? ""}"
					placeholder="${placeholder}"
					pattern="${pattern}"
					${required ? "required" : ""}
					${dataAttributes}
				/>
			</div>
		`
	}

	open(overwrites = []) {
		const fields = structuredClone(this.fields)

		overwrites.forEach((overwrite) => {
			for (let fieldI = 0; fieldI < fields.length; fieldI++) {
				const field = fields[fieldI]

				if (field.name === overwrite.name) {
					for (const [key, value] of Object.entries(overwrite)) {
						fields[fieldI][key] = value
					}
				}
			}
		})

		this.fields = fields

		this.container = this.render()
		this.overlay = this.renderOverlay()

		document.body.appendChild(this.overlay)
		document.body.appendChild(this.container)
	}

	close() {
		this.overlay.remove()

		this.container.remove()
	}
}

export { Menu, PopupMenu }
