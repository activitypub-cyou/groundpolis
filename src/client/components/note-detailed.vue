<template>
<div
	class="note _panel"
	v-if="!muted"
	v-show="!isDeleted"
	:tabindex="!isDeleted ? '-1' : null"
	:class="{ renote: isRenote }"
	v-hotkey="keymap"
	v-size="{ max: [500, 450, 350, 300] }"
>
	<XSub v-for="note in conversation" class="reply-to-more" :key="note.id" :note="note"/>
	<XSub :note="appearNote.reply" class="reply-to" v-if="appearNote.reply"/>
	<div class="renote" v-if="isRenote">
		<MkAvatar class="avatar" :user="note.user"/>
		<Fa :icon="faRetweet"/>
		<I18n :src="$ts.renotedBy" tag="span">
			<template #user>
				<MkA class="name" :to="userPage(note.user)" v-user-preview="note.userId">
					<MkUserName :user="note.user"/>
				</MkA>
			</template>
		</I18n>
		<div class="info">
			<button class="_button time" @click="showRenoteMenu()" ref="renoteTime">
				<Fa class="dropdownIcon" v-if="isMyRenote || (this.$i && (this.$i.isModerator || this.$i.isAdmin))" :icon="faEllipsisH"/>
				<MkTime :time="note.createdAt"/>
			</button>
			<span class="visibility" v-if="note.visibility !== 'public'">
				<VisibilityIcon
					:visibility="note.visibility"
					:localOnly="note.localOnly"
					:remoteFollowersOnly="note.remoteFollowersOnly"
					/>
			</span>
		</div>
	</div>
	<article class="article" @contextmenu.stop="onContextmenu">
		<header class="header">
			<MkAvatar class="avatar" :user="appearNote.user"/>
			<div class="body">
				<div class="top">
					<MkA class="name" :to="userPage(appearNote.user)" v-user-preview="appearNote.user.id">
						<MkUserName :user="appearNote.user"/>
					</MkA>
					<span class="is-bot" v-if="appearNote.user.isBot">bot</span>
					<!-- <span class="localOnly" v-if="note.localOnly"><Fa :icon="faBiohazard"/></span> -->
				</div>
				<div class="username"><MkAcct :user="appearNote.user"/></div>
				<div v-if="showTicker && !appearNote.user.host" class="instance-ticker groundpolis">
					<img src="/favicon.ico" alt="favicon" class="favicon"/>
					<span v-text="meta.name && meta.name !== host ? `${meta.name} (${host})` : host"/>
				</div>
				<div v-else-if="showTicker && instance" class="instance-ticker" :class="instance.softwareName">
					<img :src="instance.iconUrl" alt="favicon" class="favicon"/>
					<span v-text="instance.name && instance.name !== instance.host ? `${instance.name} (${instance.host})` : instance.host"/>
				</div>
			</div>
		</header>
		<div class="main">
			<div class="body">
				<p v-if="appearNote.cw != null" class="cw">
					<Mfm v-if="appearNote.cw != '' && !isPlainMode" class="text" :text="appearNote.cw" :author="appearNote.user" :i="$i" :custom-emojis="appearNote.emojis"/>
					<MkPlainText v-else-if="appearNote.cw != ''" class="text" :text="appearNote.cw"/>
					<XCwButton v-model:value="showContent" :note="appearNote"/>
				</p>
				<div class="content" v-show="appearNote.cw == null || showContent">
					<div class="text">
						<span v-if="appearNote.isHidden" style="opacity: 0.5">({{ $ts.private }})</span>
						<MkA class="reply" v-if="appearNote.replyId" :to="`/notes/${appearNote.replyId}`"><Fa :icon="faReply"/></MkA>
						<Mfm v-if="appearNote.text && !isPlainMode" :text="appearNote.text" :author="appearNote.user" :i="$i" :custom-emojis="appearNote.emojis"/>
						<MkPlainText v-else-if="appearNote.text" :text="appearNote.text"/>
						<a class="rp" v-if="appearNote.renote != null">RN:</a>
					</div>
					<div class="files" v-if="appearNote.files.length > 0">
						<XMediaList :media-list="appearNote.files"/>
					</div>
					<XPoll v-if="appearNote.poll" :note="appearNote" ref="pollViewer" class="poll"/>
					<MkUrlPreview v-for="url in urls" :url="url" :key="url" :compact="true" :detail="true" class="url-preview"/>
					<div class="renote" v-if="appearNote.renote"><XNotePreview :note="appearNote.renote"/></div>
				</div>
				<MkA v-if="appearNote.channel && !inChannel" class="channel" :to="`/channels/${appearNote.channel.id}`"><Fa :icon="faSatelliteDish"/> {{ appearNote.channel.name }}</MkA>
			</div>
			<footer class="footer">
				<div class="info">
					<div class="created-at">
						<MkTime :time="note.createdAt" mode="detail"/>
					</div>
					<div>
						<VisibilityIcon class="visibility _mr-1"
							:visibility="appearNote.visibility"
							:localOnly="appearNote.localOnly"
							:remoteFollowersOnly="appearNote.remoteFollowersOnly"
							/>
						<span>{{$t('_visibility.' + note.visibility)}}</span>
					</div>
				</div>
				<div class="renotes" v-if="renoteState">
					<MkA :to="`/notes/${appearNote.id}/renotes`">
						<I18n :src="renoteState.isQuoted && renoteState.isRenoted ? $ts.renoteQuoteCount : renoteState.isQuoted ? $ts.quoteCount : $ts.renoteCount" tag="span">
							<template #count><strong v-text="appearNote.renoteCount" /></template>
						</I18n>
					</MkA>
				</div>
				<XReactionsViewer v-if="!disableReactions" :note="appearNote" ref="reactionsViewer"/>
				<button @click="reply()" class="button _button">
					<template v-if="appearNote.reply"><Fa :icon="faReplyAll"/></template>
					<template v-else><Fa :icon="faReply"/></template>
					<p class="count" v-if="appearNote.repliesCount > 0">{{ appearNote.repliesCount }}</p>
				</button>
				<button v-if="canRenote" @click="renote()" class="button _button" ref="renoteButton">
					<Fa :icon="faRetweet"/>
				</button>
				<button v-else class="button _button">
					<Fa :icon="faBan"/>
				</button>
				<template v-if="disableReactions">
					<button class="button _button" @click="toggleLike()" :class="{ reacted: hasMyReaction }">
						<Fa v-if="hasMyReaction" :icon="faHeartS"/>
						<Fa v-else :icon="faHeartR"/>
						<p class="count" v-if="reactionsCount > 0">{{ reactionsCount }}</p>
					</button>
				</template>
				<template v-else>
					<button v-if="appearNote.myReaction == null" class="button _button" @click="react()" ref="reactButton">
						<Fa :icon="faPlus"/>
					</button>
					<button v-if="appearNote.myReaction != null" class="button _button reacted" @click="undoReact(appearNote)" ref="reactButton">
						<Fa :icon="faMinus"/>
					</button>
				</template>
				<button class="button _button" @click="menu()" ref="menuButton">
					<Fa :icon="faEllipsisH"/>
				</button>
			</footer>
		</div>
	</article>
	<XSub v-for="note in replies" :key="note.id" :note="note" class="reply" :detail="true"/>
</div>
<div v-else class="_panel muted" @click="muted = false">
	<I18n :src="$ts.userSaysSomething" tag="small">
		<template #name>
			<MkA class="name" :to="userPage(appearNote.user)" v-user-preview="appearNote.userId">
				<MkUserName :user="appearNote.user"/>
			</MkA>
		</template>
	</I18n>
</div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, markRaw } from 'vue';
import { faSatelliteDish, faBolt, faTimes, faBullhorn, faStar, faLink, faExternalLinkSquareAlt, faPlus, faMinus, faRetweet, faReply, faReplyAll, faEllipsisH, faHome, faUnlock, faEnvelope, faThumbtack, faBan, faQuoteRight, faPlug, faExclamationCircle, faPaperclip, faUsers, faGlobe, faHeart as faHeartS, faAlignLeft, faBookmark, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { faCopy, faTrashAlt, faEdit, faEye, faEyeSlash, faHeart as faHeartR, faMehRollingEyes, faBookmark as farBookmark } from '@fortawesome/free-regular-svg-icons';
import { sum } from '../../prelude/array';
import * as mfm from 'mfm-js';
import XSub from './note.sub.vue';
import XNoteHeader from './note-header.vue';
import XNotePreview from './note-preview.vue';
import XReactionsViewer from './reactions-viewer.vue';
import XMediaList from './media-list.vue';
import XCwButton from './cw-button.vue';
import VisibilityIcon from './visibility-icon.vue';
import XPoll from './poll.vue';
import { pleaseLogin } from '@/scripts/please-login';
import { focusPrev, focusNext } from '@/scripts/focus';
import { url, host } from '@/config';
import copyToClipboard from '@/scripts/copy-to-clipboard';
import { checkWordMute } from '@/scripts/check-word-mute';
import { userPage } from '@/filters/user';
import * as os from '@/os';
import { noteActions, noteViewInterruptors } from '@/store';
import { extractUrlFromMfm } from '../../misc/extract-url-from-mfm';

function markRawAll(...xs) {
	for (const x of xs) {
		markRaw(x);
	}
}

markRawAll(
	faEdit, faBolt, faTimes, faBullhorn, faPlus, faMinus, faRetweet, faReply, faReplyAll, faEllipsisH, faHome, faUnlock, faEnvelope, faThumbtack, faBan, faPlug, faSatelliteDish, faUsers, faGlobe, faHeartS, faHeartR, faBookmark, farBookmark,
);

// TODO: note.vueとほぼ同じなので共通化したい
export default defineComponent({
	components: {
		XSub,
		XNoteHeader,
		XNotePreview,
		XReactionsViewer,
		XMediaList,
		XCwButton,
		XPoll,
		MkUrlPreview: defineAsyncComponent(() => import('@/components/url-preview.vue')),
		VisibilityIcon,
	},

	inject: {
		inChannel: {
			default: null
		},
	},

	props: {
		note: {
			type: Object,
			required: true
		},
	},

	emits: ['update:note'],

	data() {
		return {
			connection: null,
			conversation: [],
			replies: [],
			isDeleted: false,
			muted: false,
			showContent: false,
			instance: null as {} | null,
			renoteState: null as {
				isRenoted: boolean;
				isQuoted: boolean;
			} | null,
			isPlainMode: false,
			host,
			faEdit, faBolt, faTimes, faBullhorn, faPlus, faMinus, faRetweet, faReply, faReplyAll, faEllipsisH, faHome, faUnlock, faEnvelope, faThumbtack, faBan, faPlug, faSatelliteDish, faUsers, faGlobe, faHeartS, faHeartR, faBookmark, farBookmark,
		};
	},

	computed: {
		disableReactions() {
			return this.$store.reactiveState.disableReactions.value;
		},
		rs() {
			return this.$store.state.reactions;
		},
		keymap(): any {
			return {
				'r': () => this.reply(true),
				'e|a|plus': () => this.react(true),
				'q': () => this.renote(true),
				'f|b': this.favorite,
				'delete|ctrl+d': this.del,
				'ctrl+q': this.renoteDirectly,
				'up|k|shift+tab': this.focusBefore,
				'down|j|tab': this.focusAfter,
				'esc': this.blur,
				'm|o': () => this.menu(true),
				's': this.toggleShowContent,
				'1': () => this.reactDirectly(this.rs[0]),
				'2': () => this.reactDirectly(this.rs[1]),
				'3': () => this.reactDirectly(this.rs[2]),
				'4': () => this.reactDirectly(this.rs[3]),
				'5': () => this.reactDirectly(this.rs[4]),
				'6': () => this.reactDirectly(this.rs[5]),
				'7': () => this.reactDirectly(this.rs[6]),
				'8': () => this.reactDirectly(this.rs[7]),
				'9': () => this.reactDirectly(this.rs[8]),
				'0': () => this.reactDirectly(this.rs[9]),
			};
		},

		isRenote(): boolean {
			return (this.note.renote &&
				this.note.text == null &&
				this.note.fileIds.length == 0 &&
				this.note.poll == null);
		},

		appearNote(): any {
			return this.isRenote ? this.note.renote : this.note;
		},

		isMyNote(): boolean {
			return this.$i && (this.$i.id === this.appearNote.userId);
		},

		isMyRenote(): boolean {
			return this.$i && (this.$i.id === this.note.userId);
		},

		canRenote(): boolean {
			return ['public', 'home'].includes(this.appearNote.visibility) || this.isMyNote;
		},

		reactionsCount(): number {
			return this.appearNote.reactions
				? sum(Object.values(this.appearNote.reactions))
				: 0;
		},

		urls(): string[] {
			if (this.appearNote.text) {
				return extractUrlFromMfm(mfm.parse(this.appearNote.text));
			} else {
				return null;
			}
		},

		hasMyReaction() {
			return this.appearNote.myReaction != null;
		},

		showTicker() {
			const mode = this.$store.state.instanceTicker;
			return mode === 'always' || (mode === 'remote' && this.appearNote.user.host);
		},

		meta() {
			return this.$instance;
		},
	},

	async created() {
		if (this.$i) {
			this.connection = os.stream;
		}

		this.muted = await checkWordMute(this.appearNote, this.$i, this.$store.state.mutedWords);

		if (this.appearNote.renoteCount > 0) {
			this.renoteState = await os.api('notes/is-renoted', {
				noteId: this.appearNote.id,
			});
		}

		// plugin
		if (noteViewInterruptors.length > 0) {
			let result = this.note;
			for (const interruptor of noteViewInterruptors) {
				result = await interruptor.handler(JSON.parse(JSON.stringify(result)));
			}
			this.$emit('update:note', Object.freeze(result));
		}

		os.api('notes/children', {
			noteId: this.appearNote.id,
			limit: 30
		}).then(replies => {
			this.replies = replies;
		});

		if (this.appearNote.replyId) {
			os.api('notes/conversation', {
				noteId: this.appearNote.replyId
			}).then(conversation => {
				this.conversation = conversation.reverse();
			});
		}
	},

	async mounted() {
		this.capture(true);

		if (this.$i) {
			this.connection.on('_connected_', this.onStreamConnected);
		}

		if (this.showTicker) {
			this.instance = await os.getInstance(this.appearNote.user.host);
		}
	},

	beforeUnmount() {
		this.decapture(true);

		if (this.$i) {
			this.connection.off('_connected_', this.onStreamConnected);
		}
	},

	methods: {
		updateAppearNote(v) {
			this.$emit('update:note', Object.freeze(this.isRenote ? {
				...this.note,
				renote: {
					...this.note.renote,
					...v
				}
			} : {
				...this.note,
				...v
			}));
		},

		readPromo() {
			os.api('promo/read', {
				noteId: this.appearNote.id
			});
			this.isDeleted = true;
		},

		capture(withHandler = false) {
			if (this.$i) {
				this.connection.send(document.body.contains(this.$el) ? 'sn' : 's', { id: this.appearNote.id });
				if (withHandler) this.connection.on('noteUpdated', this.onStreamNoteUpdated);
			}
		},

		decapture(withHandler = false) {
			if (this.$i) {
				this.connection.send('un', {
					id: this.appearNote.id
				});
				if (withHandler) this.connection.off('noteUpdated', this.onStreamNoteUpdated);
			}
		},

		onStreamConnected() {
			this.capture();
		},

		onStreamNoteUpdated(data) {
			const { type, id, body } = data;

			if (id !== this.appearNote.id) return;

			switch (type) {
				case 'reacted': {
					const reaction = body.reaction;

					// DeepではなくShallowコピーであることに注意。n.reactions[reaction] = hogeとかしないように(親からもらったデータをミューテートすることになるので)
					let n = {
						...this.appearNote,
					};

					if (body.emoji) {
						const emojis = this.appearNote.emojis || [];
						if (!emojis.includes(body.emoji)) {
							n.emojis = [...emojis, body.emoji];
						}
					}

					// TODO: reactionsプロパティがない場合ってあったっけ？ なければ || {} は消せる
					const currentCount = (this.appearNote.reactions || {})[reaction] || 0;

					// Increment the count
					n.reactions = {
						...this.appearNote.reactions,
						[reaction]: currentCount + 1
					};

					if (body.userId === this.$i.id) {
						n.myReaction = reaction;
					}

					this.updateAppearNote(n);
					break;
				}

				case 'unreacted': {
					const reaction = body.reaction;

					// DeepではなくShallowコピーであることに注意。n.reactions[reaction] = hogeとかしないように(親からもらったデータをミューテートすることになるので)
					let n = {
						...this.appearNote,
					};

					// TODO: reactionsプロパティがない場合ってあったっけ？ なければ || {} は消せる
					const currentCount = (this.appearNote.reactions || {})[reaction] || 0;

					// Decrement the count
					n.reactions = {
						...this.appearNote.reactions,
						[reaction]: Math.max(0, currentCount - 1)
					};

					if (body.userId === this.$i.id) {
						n.myReaction = null;
					}

					this.updateAppearNote(n);
					break;
				}

				case 'pollVoted': {
					const choice = body.choice;

					// DeepではなくShallowコピーであることに注意。n.reactions[reaction] = hogeとかしないように(親からもらったデータをミューテートすることになるので)
					let n = {
						...this.appearNote,
					};

					const choices = [...this.appearNote.poll.choices];
					choices[choice] = {
						...choices[choice],
						votes: choices[choice].votes + 1,
						...(body.userId === this.$i.id ? {
							isVoted: true
						} : {})
					};

					n.poll = {
						...this.appearNote.poll,
						choices: choices
					};

					this.updateAppearNote(n);
					break;
				}

				case 'deleted': {
					this.isDeleted = true;
					break;
				}
			}
		},

		reply(viaKeyboard = false) {
			pleaseLogin();
			os.post({
				reply: this.appearNote,
				animation: !viaKeyboard,
			}, () => {
				this.focus();
			});
		},

		renote(viaKeyboard = false) {
			const renote = async () => {
				const canceled = this.$store.state.showRenoteConfirm && (await os.dialog({
					type: 'question',
					text: this.$ts.renoteConfirm,
					showCancelButton: true
				})).canceled;
				if (canceled) return;

				await os.api('notes/create', {
					renoteId: this.appearNote.id
				});
			};
			const quote = () => {
				os.post({
					channel: this.appearNote.channel,
					renote: this.appearNote,
				});
			};

			const choose = () => {
				os.modalMenu([{
					text: this.$ts.renote,
					icon: faRetweet,
					action: renote,
				}, {
					text: this.$ts.quote,
					icon: faQuoteRight,
					action: quote,
				}], this.$refs.renoteButton, {
					viaKeyboard
				});
			};

			if (this.preview) return;
			pleaseLogin();
			this.blur();
			switch (this.$store.state.renoteButtonMode) {
				case 'choose': choose(); break;
				case 'renote': renote(); break;
				case 'quote': quote(); break;
				case 'renoteQuote': renote(); quote(); break;
			}

		},

		renoteDirectly() {
			os.apiWithDialog('notes/create', {
				renoteId: this.appearNote.id
			}, undefined, (res: any) => {
				os.dialog({
					type: 'success',
					text: this.$ts.renoted,
				});
			}, (e: Error) => {
				if (e.id === 'b5c90186-4ab0-49c8-9bba-a1f76c282ba4') {
					os.dialog({
						type: 'error',
						text: this.$ts.cantRenote,
					});
				} else if (e.id === 'fd4cc33e-2a37-48dd-99cc-9b806eb2031a') {
					os.dialog({
						type: 'error',
						text: this.$ts.cantReRenote,
					});
				}
			});
		},

		async react(viaKeyboard = false) {
			pleaseLogin();
			this.blur();
			const { reaction } = await os.reactionPicker({
				reactions: this.splited,
				showFocus: viaKeyboard,
				src: this.$refs.reactButton,
			});

			if (reaction) {
				os.api('notes/reactions/create', {
					noteId: this.appearNote.id,
					reaction
				});
			}
			this.focus();
		},

		async toggleLike() {
			if (this.preview) return;
			pleaseLogin();

			os.api('notes/reactions/' + (this.hasMyReaction ? 'delete' : 'create'), {
				noteId: this.appearNote.id,
			});
		},

		reactDirectly(reaction) {
			os.api('notes/reactions/create', {
				noteId: this.appearNote.id,
				reaction: reaction
			});
		},

		undoReact(note) {
			const oldReaction = note.myReaction;
			if (!oldReaction) return;
			os.api('notes/reactions/delete', {
				noteId: note.id
			});
		},

		favorite() {
			pleaseLogin();
			os.apiWithDialog('notes/favorites/create', {
				noteId: this.appearNote.id
			}, undefined, (res: any) => {
				os.dialog({
					type: 'success',
					text: this.$ts.favorited,
				});
			}, (e: Error) => {
				if (e.id === 'a402c12b-34dd-41d2-97d8-4d2ffd96a1a6') {
					os.dialog({
						type: 'error',
						text: this.$ts.alreadyFavorited,
					});
				} else if (e.id === '6dd26674-e060-4816-909a-45ba3f4da458') {
					os.dialog({
						type: 'error',
						text: this.$ts.cantFavorite,
					});
				}
			});
		},

		del() {
			os.dialog({
				type: 'warning',
				text: (this.appearNote.userId == this.$i.id) ? this.$ts.noteDeleteConfirm : this.$ts.noteDeleteAsAdminConfirm,
				showCancelButton: true
			}).then(({ canceled }) => {
				if (canceled) return;

				os.api('notes/delete', {
					noteId: this.appearNote.id
				});
			});
		},

		delEdit() {
			os.dialog({
				type: 'warning',
				text: this.$ts.deleteAndEditConfirm,
				showCancelButton: true
			}).then(({ canceled }) => {
				if (canceled) return;

				os.api('notes/delete', {
					noteId: this.appearNote.id
				});

				os.post({ initialNote: this.appearNote, renote: this.appearNote.renote, reply: this.appearNote.reply, channel: this.appearNote.channel });
			});
		},

		toggleFavorite(favorite: boolean) {
			os.apiWithDialog(favorite ? 'notes/favorites/create' : 'notes/favorites/delete', {
				noteId: this.appearNote.id
			});
		},

		toggleWatch(watch: boolean) {
			os.apiWithDialog(watch ? 'notes/watching/create' : 'notes/watching/delete', {
				noteId: this.appearNote.id
			});
		},

		getMenu() {
			let menu;
			if (this.$i) {
				const statePromise = os.api('notes/state', {
					noteId: this.appearNote.id
				});

				menu = [{
					icon: faCopy,
					text: this.$ts.copyContent,
					action: this.copyContent
				}, {
					icon: faLink,
					text: this.$ts.copyLink,
					action: this.copyLink
				}, (this.appearNote.url || this.appearNote.uri) ? {
					icon: faExternalLinkSquareAlt,
					text: this.$ts.showOnRemote,
					action: () => {
						window.open(this.appearNote.url || this.appearNote.uri, '_blank');
					}
				} : undefined,
				null,
				statePromise.then(state => state.isFavorited ? {
					icon: faStar,
					text: this.$ts.unfavorite,
					action: () => this.toggleFavorite(false)
				} : {
					icon: faStar,
					text: this.$ts.favorite,
					action: () => this.toggleFavorite(true)
				}),
				{
					icon: faPaperclip,
					text: this.$ts.clip,
					action: () => this.clip()
				},
				(this.appearNote.userId != this.$i.id) ? statePromise.then(state => state.isWatching ? {
					icon: faEyeSlash,
					text: this.$ts.unwatch,
					action: () => this.toggleWatch(false)
				} : {
					icon: faEye,
					text: this.$ts.watch,
					action: () => this.toggleWatch(true)
				}) : undefined,
				this.appearNote.userId == this.$i.id ? (this.$i.pinnedNoteIds || []).includes(this.appearNote.id) ? {
					icon: faThumbtack,
					text: this.$ts.unpin,
					action: () => this.togglePin(false)
				} : {
					icon: faThumbtack,
					text: this.$ts.pin,
					action: () => this.togglePin(true)
				} : undefined,
				...(this.$i.isModerator || this.$i.isAdmin ? [
					null,
					{
						icon: faBullhorn,
						text: this.$ts.promote,
						action: this.promote
					}]
					: []
				),
				// 自分でない、パブリック, ホーム なノート
				...(!this.isMyNote && ['public', 'home'].includes(this.appearNote.visibility) ? [
					null,
					{
						icon: faMehRollingEyes,
						text: this.$ts.steal,
						action: this.steal
					}]
					: []
				),
				...(this.appearNote.text ? [{
						icon: faClipboardList,
						text: this.$ts._template.registerAs,
						action: this.registerAsTemplate,
					}] : []
				),
				...(this.appearNote.userId != this.$i.id ? [
					null,
					{
						icon: faExclamationCircle,
						text: this.$ts.reportAbuse,
						action: () => {
							const u = `${url}/notes/${this.appearNote.id}`;
							os.popup(import('@/components/abuse-report-window.vue'), {
								user: this.appearNote.user,
								initialComment: `Note: ${u}\n-----\n`
							}, {}, 'closed');
						}
					}]
					: []
				),
				{
					icon: faAlignLeft,
					text: this.$t(this.isPlainMode ? 'showAsMfm' : 'showAsPlainText'),
					action: () => this.isPlainMode = !this.isPlainMode,
				},
				...(this.appearNote.userId == this.$i.id || this.$i.isModerator || this.$i.isAdmin ? [
					null,
					this.appearNote.userId == this.$i.id ? {
						icon: faEdit,
						text: this.$ts.deleteAndEdit,
						action: this.delEdit
					} : undefined,
					{
						icon: faTrashAlt,
						text: this.$ts.delete,
						danger: true,
						action: this.del
					}]
					: []
				)]
				.filter(x => x !== undefined);
			} else {
				menu = [{
					icon: faCopy,
					text: this.$ts.copyContent,
					action: this.copyContent
				}, {
					icon: faLink,
					text: this.$ts.copyLink,
					action: this.copyLink
				}, (this.appearNote.url || this.appearNote.uri) ? {
					icon: faExternalLinkSquareAlt,
					text: this.$ts.showOnRemote,
					action: () => {
						window.open(this.appearNote.url || this.appearNote.uri, '_blank');
					}
				} : undefined]
				.filter(x => x !== undefined);
			}

			if (noteActions.length > 0) {
				menu = menu.concat([null, ...noteActions.map(action => ({
					icon: faPlug,
					text: action.title,
					action: () => {
						action.handler(this.appearNote);
					}
				}))]);
			}

			return menu;
		},

		onContextmenu(e) {
			const isLink = (el: HTMLElement) => {
				if (el.tagName === 'A') return true;
				if (el.parentElement) {
					return isLink(el.parentElement);
				}
			};
			if (isLink(e.target)) return;
			if (window.getSelection().toString() !== '') return;
			os.contextMenu(this.getMenu(), e).then(this.focus);
		},

		menu(viaKeyboard = false) {
			os.modalMenu(this.getMenu(), this.$refs.menuButton, {
				viaKeyboard
			}).then(this.focus);
		},

		showRenoteMenu(viaKeyboard = false) {
			if (!this.isMyRenote && !(this.$i && (this.$i.isModerator || this.$i.isAdmin))) return;
			os.modalMenu([{
				text: (this.isMyRenote) ? this.$ts.unrenote : this.$ts.unrenoteAsAdmin,
				icon: faTrashAlt,
				danger: true,
				action: () => {
					os.api('notes/delete', {
						noteId: this.note.id
					});
					this.isDeleted = true;
				}
			}], this.$refs.renoteTime, {
				viaKeyboard: viaKeyboard
			});
		},

		toggleShowContent() {
			this.showContent = !this.showContent;
		},

		copyContent() {
			copyToClipboard(this.appearNote.text);
			os.success();
		},

		copyLink() {
			copyToClipboard(`${url}/notes/${this.appearNote.id}`);
			os.success();
		},

		togglePin(pin: boolean) {
			os.apiWithDialog(pin ? 'i/pin' : 'i/unpin', {
				noteId: this.appearNote.id
			}, undefined, null, e => {
				if (e.id === '72dab508-c64d-498f-8740-a8eec1ba385a') {
					os.dialog({
						type: 'error',
						text: this.$ts.pinLimitExceeded
					});
				}
			});
		},

		async clip() {
			const clips = await os.api('clips/list');
			os.modalMenu([{
				icon: faPlus,
				text: this.$ts.createNew,
				action: async () => {
					const { canceled, result } = await os.form(this.$ts.createNewClip, {
						name: {
							type: 'string',
							label: this.$ts.name
						},
						description: {
							type: 'string',
							required: false,
							multiline: true,
							label: this.$ts.description
						},
						isPublic: {
							type: 'boolean',
							label: this.$ts.public,
							default: false
						}
					});
					if (canceled) return;

					const clip = await os.apiWithDialog('clips/create', result);

					os.apiWithDialog('clips/add-note', { clipId: clip.id, noteId: this.appearNote.id });
				}
			}, null, ...clips.map(clip => ({
				text: clip.name,
				action: () => {
					os.apiWithDialog('clips/add-note', { clipId: clip.id, noteId: this.appearNote.id });
				}
			}))], this.$refs.menuButton, {
			}).then(this.focus);
		},

		async promote() {
			const { canceled, result: days } = await os.dialog({
				title: this.$ts.numberOfDays,
				input: { type: 'number' }
			});

			if (canceled) return;

			os.apiWithDialog('admin/promo/create', {
				noteId: this.appearNote.id,
				expiresAt: Date.now() + (86400000 * days)
			});
		},

		async steal() {
			if (!this.appearNote.text) return;

			const canceled = this.$store.state.showStealConfirm && (await os.dialog({
				type: 'question',
				text: this.$ts.stealConfirm,
				showCancelButton: true
			})).canceled;
			if (canceled) return;

			const rule = this.$store.state.stealRule;

			if (rule === 1) {
				this.reactDirectly(this.$store.state.stealReaction);
			}
			if (rule === 2) {
				this.renoteDirectly();
			}
			const u = this.appearNote.uri || this.appearNote.url || `${url}/notes/${this.appearNote.id}`;
			const text = this.appearNote.text + (rule === 3 ? '\n\n' + u : '');
			os.createNoteInstantly(text, this.appearNote.cw, this.appearNote.visibility);
		},

		async registerAsTemplate() {
			if (!this.appearNote.text) return;

			os.dialog({
				title: this.$ts._template.inputLabel,
				text: this.$ts._template.labelDesc,
				input:  {
					default: '',
				},
				autoComplete: true
			}).then(({ canceled, result }) => {
				if (canceled) return;
				if (!result) return;
				this.$store.set('templateList', [
					...this.$store.state.templateList,
					{
						label: result,
						body: this.appearNote.text,
					}
				]);
				os.dialog({
					type: 'success',
					text: this.$ts.added,
				});
			});
		},

		focus() {
			this.$el.focus();
		},

		blur() {
			this.$el.blur();
		},

		focusBefore() {
			focusPrev(this.$el);
		},

		focusAfter() {
			focusNext(this.$el);
		},

		userPage
	}
});
</script>

<style lang="scss" scoped>
@mixin ticker($bg, $fg) {
	background: linear-gradient(90deg, $bg, transparent);
	// background: $bg;
	color: $fg;
}

.note {
	position: relative;
	transition: box-shadow 0.1s ease;
	overflow: hidden;
	contain: content;

	&:focus-visible {
		outline: none;

		&:after {
			content: "";
			pointer-events: none;
			display: block;
			position: absolute;
			z-index: 10;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			margin: auto;
			width: calc(100% - 8px);
			height: calc(100% - 8px);
			border: dashed 1px var(--focus);
			border-radius: var(--radius);
			box-sizing: border-box;
		}
	}

	&:hover > .article > .main > .footer > .button {
		opacity: 1;
	}

	> .reply-to {
		opacity: 0.7;
		padding-bottom: 0;
	}

	> .reply-to-more {
		opacity: 0.7;
	}

	> .renote {
		display: flex;
		align-items: center;
		padding: 16px 32px 8px 32px;
		line-height: 28px;
		white-space: pre;
		color: var(--renote);

		> .avatar {
			flex-shrink: 0;
			display: inline-block;
			width: 28px;
			height: 28px;
			margin: 0 8px 0 0;
			border-radius: 6px;
		}

		> [data-icon] {
			margin-right: 4px;
		}

		> span {
			overflow: hidden;
			flex-shrink: 1;
			text-overflow: ellipsis;
			white-space: nowrap;

			> .name {
				font-weight: bold;
			}
		}

		> .info {
			margin-left: auto;
			font-size: 0.9em;

			> div {
				.time {
					flex-shrink: 0;
					color: inherit;

					> .dropdownIcon {
						margin-right: 4px;
					}
				}

				.visibility {
					margin-left: 8px;
				}

				.localOnly {
					margin-left: 8px;
				}
			}
		}
	}

	> .renote + .article {
		padding-top: 8px;
	}

	> .article {
		padding: 32px;
		font-size: 1.1em;

		> .header {
			display: flex;
			position: relative;
			margin-bottom: 16px;

			> .avatar {
				display: block;
				flex-shrink: 0;
				width: 58px;
				height: 58px;
			}

			> .body {
				flex: 1;
				display: flex;
				flex-direction: column;
				justify-content: center;
				padding-left: 16px;
				font-size: 0.95em;

				> .top {
					> .name {
						font-weight: bold;
					}

					> .is-bot {
						flex-shrink: 0;
						align-self: center;
						margin: 0 0.5em;
						padding: 4px 6px;
						font-size: 80%;
						border: solid 1px var(--divider);
						border-radius: 4px;
					}

				}

				> .instance-ticker {
					display: flex;
					@include ticker(var(--bg), var(--fg));
					width: 100%;
					margin-bottom: 8px;
					align-items: center;
					padding: 1px 8px;
					font-size: 0.8em;
					font-weight: bold;
					border-radius: 4px 0 0 4px;

					&.misskey {
						@include ticker(rgb(134, 179, 0), rgb(242, 242, 242));
					}

					&.groundpolis {
						@include ticker(#251a10, rgb(110, 229, 0));
					}

					&.mastodon {
						@include ticker(#2b90d9, #fff);
					}

					&.pleroma {
						@include ticker(#10181e, #ffaf6d);
					}

					> .favicon {
						display: inline-block;
						height: 1em;
						margin-right: 4px;
					}
				}
			}
		}

		> .main {
			> .body {
				> .cw {
					cursor: default;
					display: block;
					margin: 0;
					padding: 0;
					overflow-wrap: break-word;

					> .text {
						margin-right: 8px;
					}
				}

				> .content {
					> .text {
						overflow-wrap: break-word;

						> .reply {
							color: var(--accent);
							margin-right: 0.5em;
						}

						> .rp {
							margin-left: 4px;
							font-style: oblique;
							color: var(--renote);
						}
					}

					> .url-preview {
						margin-top: 8px;
					}

					> .poll {
						font-size: 80%;
					}

					> .renote {
						padding: 8px 0;

						> * {
							padding: 16px;
							border: dashed 1px var(--renote);
							border-radius: 8px;
						}
					}
				}

				> .channel {
					opacity: 0.7;
					font-size: 80%;
				}
			}

			> .footer {
				> .info {
					margin: 16px 0;
					opacity: 0.7;
					font-size: 0.9em;
				}

				> .renotes {
					opacity: 0.8;
					margin: 8px 0;
					> a {
						text-decoration: underline;
					}
				}

				> .button {
					margin: 0;
					padding: 8px;
					opacity: 0.7;

					&:not(:last-child) {
						margin-right: 28px;
					}

					&:hover {
						color: var(--fgHighlighted);
					}

					> .count {
						display: inline;
						margin: 0 0 0 8px;
						opacity: 0.7;
					}

					&.reacted {
						color: var(--accent);
					}
				}
			}
		}
	}

	> .reply {
		border-top: solid 1px var(--divider);
	}

	&.max-width_500px {
		font-size: 0.9em;
	}

	&.max-width_450px {
		> .renote {
			padding: 8px 16px 0 16px;
		}

		> .article {
			padding: 16px;

			> .header {
				> .avatar {
					width: 50px;
					height: 50px;
				}
			}
		}
	}

	&.max-width_350px {
		> .article {
			> .main {
				> .footer {
					> .button {
						&:not(:last-child) {
							margin-right: 18px;
						}
					}
				}
			}
		}
	}

	&.max-width_300px {
		font-size: 0.825em;

		> .article {
			> .header {
				> .avatar {
					width: 50px;
					height: 50px;
				}
			}

			> .main {
				> .footer {
					> .button {
						&:not(:last-child) {
							margin-right: 12px;
						}
					}
				}
			}
		}
	}
}

.muted {
	padding: 8px;
	text-align: center;
	opacity: 0.7;
}
</style>
