// ==UserScript==
// @name         MaM Other Torrents
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Adds an "Other Torrents" panel to the MaM torrent page, showing other torrents with the same title from the authors
// @author       Stirling Mouse
// @match        https://www.myanonamouse.net/t/*
// @icon         https://cdn.myanonamouse.net/apple-touch-icon.png?v=b
// @grant        none
// @downloadURL	 https://github.com/StirlingMouse/MaM-Other-Torrents/raw/refs/heads/main/MAMOtherTorrents.user.js
// @updateURL    https://github.com/StirlingMouse/MaM-Other-Torrents/raw/refs/heads/main/MAMOtherTorrents.user.js
// ==/UserScript==

;(async () => {
	const currentId = +location.pathname.replace(/\/t\/(\d+)/, '$1')
	if (isNaN(currentId)) return
	const detailPage = document.querySelector('#torDetMainCon')
	if (!detailPage) return
	const description = detailPage.querySelector('.torDetBottom')
	const title = detailPage.querySelector('.TorrentTitle')?.textContent.trim()
	const authors = Array.from(detailPage.querySelectorAll('.torAuthors a')).map(
		(a) => a.textContent.trim(),
	)

	const response = await fetch('/tor/js/loadSearchJSONbasic.php', {
		method: 'post',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			tor: {
				text: `${title} (${authors.map((a) => `"${a}"`).join(' | ')})`,
				srchIn: {
					title: 'true',
					author: 'true',
				},
			},
		}),
	})
	const body = await response.json()
	console.log('MaM Other Torrents response', body)
	if (!body.data) return

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
		row.innerHTML = `<td>${t.cat}</td><td></td><td class="expand"><div class="posterImage"><img></div><a class="torTitle"></a> by <a class="author"></a><br><span class="torNarrator">Narrated by: <a class="narrator"></a></span> | <span class="series_info"><span class="torSeries"> Series: <a class="series" href=""></a></span></span><br></span><span class="torRowDesc"></span><br><span class="torFileTypes"><a></a></span> | <span class="comments"></span>comments</td><td></td><td class="shrink"><a></a><br></td><td></td><td><p>0</p><p>0</p><p>0</p></td>`
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
			poster.src = `https://cdn.myanonamouse.net/tor/poster_mini.php/${t.id}/${t.poster_type.replace('image/', '')}`
		}

		if (t.personal_freeleech) {
			tags.innerHTML += '<span title="personal freeleech">PF</span>'
		}
		if (t.free) {
			tags.innerHTML +=
				'<img src="https://cdn.myanonamouse.net/pic/freedownload.gif" alt="">'
		}
		if (t.vip) {
			tags.innerHTML +=
				'<img src="https://cdn.myanonamouse.net/pic/vip.png" alt="VIP" title="VIP">'
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
		{
			const authorInfo = JSON.parse(t.author_info)
			let clone = false
			for (const [id, name] of Object.entries(authorInfo)) {
				if (clone) author = cloneAndInsert(author)
				clone = true
				author.textContent = name
				author.href = `/tor/browse.php?author=${id}&amp;tor%5Bcat%5D%5B%5D=0`
			}
		}
		if (t.narrator_info) {
			const narratorInfo = JSON.parse(t.narrator_info)
			let clone = false
			for (const [id, name] of Object.entries(narratorInfo)) {
				if (clone) narrator = cloneAndInsert(narrator)
				clone = true
				narrator.textContent = name
				narrator.href = `/tor/browse.php?narrator=${id}&amp;tor%5Bcat%5D%5B%5D=0`
			}
		} else {
			row.querySelector('.torNarrator').nextSibling.remove()
			row.querySelector('.torNarrator').remove()
		}
		if (t.series_info) {
			const seriesInfo = JSON.parse(t.series_info)
			let clone = false
			for (const [id, [name, num]] of Object.entries(seriesInfo)) {
				if (clone) series = cloneAndInsert(series)
				clone = true
				series.textContent = `${decodeHtml(name)} (#${num})`
				series.href = `/tor/browse.php?series=${id}&amp;tor%5Bcat%5D%5B%5D=0`
			}
		} else {
			if (t.narrator_info) {
				row.querySelector('.torNarrator').nextSibling.remove()
			} else {
				row.querySelector('.series_info').nextSibling.remove()
			}
			row.querySelector('.series_info').remove()
		}
		desc.textContent = t.tags
		fileType.textContent = t.filetype
		comments.textContent = t.comments
		if (t.my_snatched) {
			info.appendChild(document.createElement('br'))
			const snatched = document.createElement('div')
			snatched.className = 'browseAct'
			snatched.innerHTML = 'Previously Downloaded'
			info.appendChild(snatched)
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
				delBookmarkConfirm(t.id)
			})
		links
			.querySelector(`#torBookmark${t.id}`)
			?.addEventListener('click', (e) => {
				console.log('click')
				e.preventDefault()
				bookmarkClick('add', t.id)
			})

		numfiles.href = `/t/${t.id}&filelist#filelistLink`
		numfiles.textContent = t.numfiles
		size.innerHTML += `[${t.size}]`
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
