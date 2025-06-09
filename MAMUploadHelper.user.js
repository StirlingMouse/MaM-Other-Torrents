// ==UserScript==
// @name         MaM Upload Helper
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Adds an "Other Torrents" panel to the MaM upload torrent page + extras
// @author       Stirling Mouse
// @match        https://www.myanonamouse.net/tor/upload.php
// @icon         https://cdn.myanonamouse.net/apple-touch-icon.png?v=b
// @grant	 GM_getValue
// @grant	 GM_setValue
// @downloadURL	 https://github.com/StirlingMouse/MaM-Other-Torrents/raw/refs/heads/main/MAMUploadHelper.user.js
// @updateURL    https://github.com/StirlingMouse/MaM-Other-Torrents/raw/refs/heads/main/MAMUploadHelper.user.js
// ==/UserScript==

;(async () => {
	const $unsafeWindow =
		typeof unsafeWindow !== 'undefined'
			? (unsafeWindow.wrappedJSObject ?? unsafeWindow)
			: window

	const uploadForm = document.querySelector('#uploadForm tbody')
	if (!uploadForm) return
	const files = Array.from(uploadForm.querySelectorAll('tr')).find(
		(tr) => tr.firstElementChild?.textContent === 'Files',
	)
	const tags = Array.from(uploadForm.querySelectorAll('tr')).find(
		(tr) => tr.firstElementChild?.textContent === 'Tags',
	)
	const firstFile = files?.querySelector('tr td.row2')?.textContent
	const title = firstFile
		?.replace(/[\[\-\.].*/, '')
		.replaceAll(/([\*\?])/g, '"$1"')
		.trim()
	const fullTitle = firstFile?.replace(/[\[\.].*/, '').trim()
	const asin = firstFile?.replace(/.*\[([A-Z0-9]+)\].*/, '$1').trim()

	const response = await fetch(
		'https://www.myanonamouse.net/tor/js/loadSearchJSONbasic.php',
		{
			method: 'post',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				tor: {
					text: `${title}`,
					srchIn: {
						title: 'true',
					},
				},
			}),
		},
	)
	const body = await response.json()
	console.log('MaM Upload Helper response', body)

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

    .otherTorrents-container .expand {
      font-size: 1em;
      font-weight: normal;
    }
    .otherTorrents-container .torNarrator,
    .otherTorrents-container .torRowDesc {
      font-size: 1em;
    }
 `
	document.body.appendChild(styles)

	if (asin) {
		const filesTable = files.querySelector('table')
		let domain = GM_getValue('audibleDomain', 'com')
		const a = document.createElement('a')
		a.href = `https://www.audible.${domain}/pd/${asin}`
		a.target = '_blank'
		a.textContent = `Audible.${domain}`
		a.style = 'margin-right: 20px;'
		a.addEventListener('click', (e) => {
			if (!e.ctrlKey || !e.metaKey) return
			e.preventDefault()
			const newDomain = prompt('enter Audible domain:', domain)
			domain = newDomain ?? domain
			GM_setValue('audibleDomain', domain)
			a.href = `https://www.audible.${domain}/pd/${asin}`
			a.textContent = `Audible.${domain}`
		})
		filesTable.parentElement.appendChild(a)
	}

	{
		const filesTable = files.querySelector('table')
		const a = document.createElement('a')
		a.href =
			`https://www.goodreads.com/search?q=` + encodeURIComponent(fullTitle)
		a.target = '_blank'
		a.textContent = 'Goodreads'
		filesTable.parentElement.appendChild(a)
	}

	{
		const a = document.createElement('a')
		a.href = `#`
		a.textContent = 'Cleanup'
		a.style = 'margin-left: 20px'
		a.addEventListener('click', (e) => {
			e.preventDefault()
			const input = tags.querySelector('input')
			input.value = input.value
				.replaceAll(/([a-z])([A-Z])/g, '$1, $2')
				.replaceAll(/(LGBT)([A-Z])/g, '$1, $2')
				.replace(', Fiction', '')
				.replace(', Nonfiction', '')
				.replace(', Audiobook', '')
				.replace(
					', Autistic Spectrum Disorder',
					', Autistic Spectrum Disorder, ASD',
				)
				.replace(', M M Romance', 'MM')
		})
		const br = tags.querySelector('br')
		br.parentElement.insertBefore(a, br)
	}

	const otherRow = document.createElement('tr')
	otherRow.className = 'torDetRow'
	otherRow.innerHTML =
		'<td class="row1">Other Torrents</td><td class="row1 otherTorrents-container"><table class="newTorTable"></table></div>'
	const table = otherRow.querySelector('table')

	let added = false
	if (body.data) {
		for (const t of body.data) {
			added = true

			const row = document.createElement('tr')
			row.innerHTML = `<td>${t.cat}</td><td></td><td class="expand"><div class="posterImage"><img></div><a class="torTitle"></a> by <a class="author"></a><br><span class="torNarrator">Narrated by: <a class="narrator"></a></span> | <span class="series_info"><span class="torSeries"> Series: <a class="series" href=""></a></span></span><br></span><span class="torRowDesc"></span><br><span class="torFileTypes"><a></a></span> | <span class="comments"></span> comments</td><td></td><td class="shrink"><a></a><br></td><td></td><td><p>0</p><p>0</p><p>0</p></td>`
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
	}

	if (!added) {
		table.parentElement.innerHTML =
			'<p>No other torrents from any of the authors with a matching title were found</p>'
	}

	uploadForm.insertBefore(otherRow, files.nextElementSibling)

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
