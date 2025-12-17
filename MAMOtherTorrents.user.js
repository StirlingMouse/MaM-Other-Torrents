// ==UserScript==
// @name         MaM Other Torrents
// @namespace    http://tampermonkey.net/
// @version      0.4.3
// @description  Adds an "Other Torrents" panel to the MaM torrent page, showing other torrents with the same title from the authors
// @author       Stirling Mouse
// @match        https://www.myanonamouse.net/t/*
// @icon         https://cdn.myanonamouse.net/apple-touch-icon.png?v=b
// @grant        none
// @downloadURL	 https://github.com/StirlingMouse/MaM-Other-Torrents/raw/refs/heads/main/MAMOtherTorrents.user.js
// @updateURL    https://github.com/StirlingMouse/MaM-Other-Torrents/raw/refs/heads/main/MAMOtherTorrents.user.js
// ==/UserScript==

;(async () => {
	const $unsafeWindow =
		typeof unsafeWindow !== 'undefined'
			? (unsafeWindow.wrappedJSObject ?? unsafeWindow)
			: window

	const currentId = +window.location.pathname.match(/\/t\/(\d+)/)[1]

	if (isNaN(currentId)) return
	const detailPage = document.querySelector('#torDetMainCon')
	if (!detailPage) return
	const description = detailPage.querySelector('.torDetBottom')
	const title = detailPage
		.querySelector('.TorrentTitle')
		?.textContent.replaceAll(/([\*\?])/g, '"$1"')
		.replaceAll(/(['`/]| - )/g, ' ')
		.replaceAll(/&|\band\b/g, '(&|and)')
		.replaceAll('!', '')
		.replaceAll(/\s+[\(\[][^\)\]]+[\)\]]/g, '')
		.trim()
	const authors = Array.from(detailPage.querySelectorAll('.torAuthors a')).map(
		(a) => a.textContent.trim(),
	)
	const authorsQuery = authors.map((a) => `"${a}"`).join(' | ')

	let categoryData
	try {
		categoryData = JSON.parse(
			localStorage.getItem('otherTorrents::categoryData'),
		)
	} catch {}
	async function fetchCategoryData() {
		const response = await fetch(
			'https://www.myanonamouse.net/tor/json/categories.php?new',
		)
		const json = await response.json()
		categoryData = {
			categories: Object.fromEntries(
				Object.values(json.categories).map((c) => [c.id, c.name]),
			),
			media_types: Object.fromEntries(
				Object.values(json.media_types).map((c) => [c.id, c.name]),
			),
		}
		localStorage.setItem(
			'otherTorrents::categoryData',
			JSON.stringify(categoryData),
		)
	}
	if (!categoryData) await fetchCategoryData()

	let response = await fetch(
		'https://www.myanonamouse.net/tor/js/loadSearchJSONbasic.php',
		{
			method: 'post',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				thumbnail: true,
				mediaInfo: true,
				tor: {
					text: `${title} (${authorsQuery})`,
					srchIn: {
						title: 'true',
						author: 'true',
					},
				},
			}),
		},
	)
	let body = await response.json()
	console.log('MaM Other Torrents response', body)
	if (!body.data || body.data.length < 2) {
		const shortTitle = title.replace(/:.*/, '')
		if (shortTitle !== title) {
			response = await fetch(
				'https://www.myanonamouse.net/tor/js/loadSearchJSONbasic.php',
				{
					method: 'post',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						thumbnail: true,
						tor: {
							text: `${shortTitle} (${authorsQuery})`,
							srchIn: {
								title: 'true',
								author: 'true',
							},
						},
					}),
				},
			)
			body = await response.json()
			console.log('MaM Other Torrents response', body)
		}
		if (!body.data) return
	}

	const styles = document.createElement('style')
	styles.innerHTML = `
	.otherTorrents-container {
	  max-block-size: 400px;
	  overflow: auto;
	}

	.otherTorrents-container table td.shrink {
	  white-space: nowrap
	}

	.otherTorrents-container table td.expand {
	  width: 99%
	}
 `
	document.body.appendChild(styles)

	const otherRow = document.createElement('div')
	otherRow.className = 'torDetRow'
	otherRow.innerHTML =
		'<div class="torDetLeft">Other Torrents</div><div class="torDetRight otherTorrents-container"><table class="newTorTable"></table></div>'
	const table = otherRow.querySelector('table')

	let added = false
	for (const t of body.data) {
		if (t.id == currentId) continue
		added = true

		const row = document.createElement('tr')
		row.dataset.torrentId = t.id
		row.innerHTML = `<td>${t.cat}</td><td><div style="width:79px;"></div><div class="posterImage"><img></div></td><td class="expand"><a class="torTitle"></a> by <a class="author"></a><br><span class="torNarrator">Narrated by: <a class="narrator"></a></span> | <span class="series_info"><span class="torSeries"> Series: <a class="series" href=""></a></span></span><br></span><span class="torRowDesc"></span><br><span class="torFileTypes"><a></a></span> | <span class="comments"></span> comments</td><td></td><td class="shrink"><a></a><br></td><td></td><td><p>0</p><p>0</p><p>0</p></td>`
		const poster = row.querySelector('.posterImage img')
		const title = row.querySelector('.torTitle')
		let author = row.querySelector('.author')
		let narrator = row.querySelector('.narrator')
		let series = row.querySelector('.series')
		const desc = row.querySelector('.torRowDesc')
		const fileType = row.querySelector('.torFileTypes a')
		const comments = row.querySelector('.comments')
		const tags = row.querySelector('td:nth-child(2)')
		const info = row.querySelector('td:nth-child(3)')
		const links = row.querySelector('td:nth-child(4)')
		const size = row.querySelector('td:nth-child(5)')
		const numfiles = row.querySelector('td:nth-child(5) a')
		const upload = row.querySelector('td:nth-child(6)')
		const seeders = row.querySelector('td:nth-child(7) p:nth-of-type(1)')
		const leechers = row.querySelector('td:nth-child(7) p:nth-of-type(2)')
		const times_completed = row.querySelector(
			'td:nth-child(7) p:nth-of-type(3)',
		)

		if (t.lang_code !== 'ENG') {
			const lang = document.createElement('span')
			lang.textContent = `[${t.lang_code}]`
			info.insertBefore(lang, info.firstChild)
		}

		if (t.poster_type) {
			poster.src = `https://cdn.myanonamouse.net/t/p/small/${t.id}.webp`
		}

		if (t.personal_freeleech) {
			tags.innerHTML += '<span title="personal freeleech">PF</span>'
		}
		if (t.free) {
			tags.innerHTML +=
				'<img src="https://cdn.myanonamouse.net/pic/freedownload.gif" alt="">'
		}
		if (t.vip) {
			if (t.vip_expire) {
				const date = new Date(t.vip_expire * 1000)
				const expire_date = date.toISOString().slice(0, 10)
				const days = Math.floor((date - new Date()) / 1000 / 60 / 60 / 24)
				tags.innerHTML += `<img src="https://cdn.myanonamouse.net/pic/vip_temp.png" alt="VIP expires ${expire_date} (in ${days} days)" title="VIP expires ${expire_date} (in ${days} days)"><br>`
			} else {
				tags.innerHTML +=
					'<img src="https://cdn.myanonamouse.net/pic/vip.png" alt="VIP" title="VIP"><br>'
			}
		}
		if (t.browseflags & (1 << 1)) {
			tags.innerHTML +=
				'<img alt="Contains Crude Language" title="Contains Crude Language" src="https://cdn.myanonamouse.net/pic/language.png">'
		}
		if (t.browseflags & (1 << 2)) {
			tags.innerHTML +=
				'<img alt="Contains Violence" title="Contains Violence" src="https://cdn.myanonamouse.net/pic/hand.png">'
		}
		if (t.browseflags & (1 << 3)) {
			tags.innerHTML +=
				'<img alt="Contains Some Explicit Sexual Content" title="Contains Some Explicit Sexual Content" src="https://cdn.myanonamouse.net/pic/lipssmall.png">'
		}
		if (t.browseflags & (1 << 4)) {
			tags.innerHTML +=
				'<img alt="Contains Explicit Sexual Content" title="Contains Explicit Sexual Content" src="https://cdn.myanonamouse.net/pic/flames.png">'
		}
		if (t.browseflags & (1 << 5)) {
			tags.innerHTML +=
				'<img alt="Abridged book" title="Abridged book" src="https://cdn.myanonamouse.net/pic/abridged.png">'
		}
		if (t.browseflags & (1 << 6)) {
			tags.innerHTML +=
				'<img alt="LGBT themed" title="LGBT themed" src="https://cdn.myanonamouse.net/pic/lgbt.png">'
		}

		title.textContent = t.title
		title.href = `/t/${t.id}`
		try {
			const authorInfo = JSON.parse(t.author_info)
			let clone = false
			for (const [id, name] of Object.entries(authorInfo)) {
				if (clone) author = cloneAndInsert(author)
				clone = true
				author.textContent = decodeHtml(name)
				author.href = `/tor/browse.php?author=${id}&amp;tor%5Bcat%5D%5B%5D=0`
			}
		} catch (e) {
			console.warn('[other torrents] authors failed', e, t.author_info)
		}
		{
			let hasNarrator = false
			if (t.narrator_info) {
				try {
					const narratorInfo = JSON.parse(t.narrator_info)
					let clone = false
					for (const [id, name] of Object.entries(narratorInfo)) {
						hasNarrator = true
						if (clone) narrator = cloneAndInsert(narrator)
						clone = true
						narrator.textContent = decodeHtml(name)
						narrator.href = `/tor/browse.php?narrator=${id}&amp;tor%5Bcat%5D%5B%5D=0`
					}
				} catch (e) {
					console.warn('[other torrents] narrators failed', e, t.narrator_info)
				}
			}
			if (!hasNarrator) {
				row.querySelector('.torNarrator').nextSibling.remove()
				row.querySelector('.torNarrator').remove()
			}
			let hasSeries = false
			if (t.series_info) {
				try {
					const seriesInfo = JSON.parse(t.series_info)
					let clone = false
					for (const [id, [name, num]] of Object.entries(seriesInfo)) {
						hasSeries = true
						if (clone) series = cloneAndInsert(series)
						clone = true
						series.textContent = num
							? `${decodeHtml(name)} (#${num})`
							: `${decodeHtml(name)}`
						series.href = `/tor/browse.php?series=${id}&amp;tor%5Bcat%5D%5B%5D=0`
					}
				} catch (e) {
					console.warn('[other torrents] series failed', e, t.series_info)
				}
			}
			if (!hasSeries) {
				if (hasNarrator) {
					row.querySelector('.torNarrator').nextSibling.remove()
				} else {
					row.querySelector('.series_info').nextSibling.remove()
				}
				row.querySelector('.series_info').remove()
			}
			if (t.ownership) {
				try {
					const [id, name] = JSON.parse(t.ownership)
					if (id) {
						t.owner = id
					}
					if (name) {
						t.owner_name = name
					}
				} catch {}
			}
		}
		desc.textContent = t.tags
		fileType.textContent = t.filetype
		try {
			const mediaInfo = JSON.parse(t.mediainfo)
			if (mediaInfo.General) {
				fileType.parentElement.after(mediaInfo.General.Duration)
				fileType.parentElement.after(document.createTextNode(' | '))
			}
			if (mediaInfo.Audio1) {
				const bitrate = document.createElement('span')
				bitrate.append(
					document.createTextNode(
						`${mediaInfo.Audio1.BitRate} ${mediaInfo.Audio1.BitRate_Mode}`,
					),
				)
				const format = document.createElement('span')
				format.append(document.createTextNode(mediaInfo.Audio1.Format))
				fileType.parentElement.after(bitrate)
				fileType.parentElement.after(document.createTextNode(' | '))
				fileType.parentElement.after(format)
				fileType.parentElement.after(document.createTextNode(' | '))
			}
		} catch (e) {
			console.warn('[other torrents] media info failed', e, t.mediainfo)
		}
		comments.textContent = t.comments
		if (t.my_snatched) {
			info.appendChild(document.createElement('br'))
			const snatched = document.createElement('div')
			snatched.className = 'browseAct'
			snatched.innerHTML = 'Previously Downloaded'
			info.appendChild(snatched)
		}
		if (t.categories) {
			let categories
			try {
				categories = JSON.parse(t.categories)
			} catch {}
			if (categories.length) {
				info.appendChild(document.createElement('br'))
				const multiCat = document.createElement('div')
				multiCat.id = 'searchMultiCat'
				for (const id of categories) {
					let name = categoryData.categories[id]
					if (!name) {
						await fetchCategoryData()
						name = categoryData.categories[id]
					}
					if (name) {
						const cat = document.createElement('a')
						cat.className = 'mCat'
						cat.dataset.mcatid = id
						cat.textContent = name
						multiCat.appendChild(cat)
					}
				}
				info.appendChild(multiCat)
			}
		}

		if (t.bookmarked) {
			links.innerHTML = `<a id="torDeBookmark${t.id}" title="Remove bookmark" role="button" tabindex="0">remove bookmark</a>`
		} else {
			links.innerHTML = `<a id="torBookmark${t.id}" title="bookmark" role="button">Bookmark</a>`
		}
		links
			.querySelector(`#torDeBookmark${t.id}`)
			?.addEventListener('click', (e) => {
				e.preventDefault()
				$unsafeWindow.delBookmarkConfirm(t.id)
			})
		links
			.querySelector(`#torBookmark${t.id}`)
			?.addEventListener('click', (e) => {
				e.preventDefault()
				$unsafeWindow.bookmarkClick('add', t.id)
			})

		numfiles.href = `/t/${t.id}&filelist#filelistLink`
		numfiles.textContent = t.numfiles
		size.append(document.createTextNode(`[${t.size}]`))
		upload.innerHTML = t.added.replace(' ', '<br>') + '<br>'
		if (t.owner) {
			upload.innerHTML += `[<a href="/u/${t.owner}"></a>]`
			upload.querySelector('a').textContent = t.owner_name
		} else {
			upload.innerHTML += `[hidden]`
		}

		seeders.textContent = t.seeders
		leechers.textContent = t.leechers
		times_completed.textContent = t.times_completed

		table.appendChild(row)
	}

	if (!added) {
		table.parentElement.innerHTML =
			'<p>No other torrents from any of the authors with a matching title were found</p>'
	}

	detailPage.insertBefore(otherRow, description)

	document.body.dispatchEvent(new Event('other-torrents-added'))

	function cloneAndInsert(element) {
		const clone = element.cloneNode()
		element.parentElement.insertBefore(clone, element.nextSibling)
		return clone
	}

	function decodeHtml(html) {
		const template = document.createElement('textarea')
		template.innerHTML = html
		return template.value
	}
})()
