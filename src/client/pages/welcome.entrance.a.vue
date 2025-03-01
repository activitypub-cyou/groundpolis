<template>
<div class="rsqzvsbo" v-if="meta">
	<div class="top">
		<MkFeaturedPhotos class="bg"/>
		<XTimeline class="tl"/>
		<img src="/assets/icon_transparent.svg" class="gplogo"/>
		<img src="/assets/milkey_transparent.svg" class="milkeylogo"/>
		<div class="emojis">
			<MkEmoji :normal="true" :no-style="true" emoji="🎉"/>
			<MkEmoji :normal="true" :no-style="true" emoji="🧡"/>
			<MkEmoji :normal="true" :no-style="true" emoji="🐈"/>
			<MkEmoji :normal="true" :no-style="true" emoji="🥬"/>
			<MkEmoji :normal="true" :no-style="true" emoji="🌲"/>
			<MkEmoji :normal="true" :no-style="true" emoji="🥤"/>
			<MkEmoji :normal="true" :no-style="true" emoji="🍇"/>
		</div>
		<div class="main _panel">
			<div class="bg">
				<div class="fade"></div>
			</div>
			<div class="fg">
				<h1>
					<img class="logo" v-if="meta.logoImageUrl" :src="meta.logoImageUrl"><span v-else class="text">{{ instanceName }}</span>
				</h1>
				<div class="about">
					<div class="desc">
						<Mfm :text="meta.description || $ts.headlineMisskey" />
					</div>
				</div>
				<div v-if="meta.disableRegistration && !meta.disableInvitation" class="warn">
					<MkInfo warn>{{ $ts.invitationRequiredToRegister }}</MkInfo>
				</div>
				<div v-if="meta.disableRegistration && meta.disableInvitation" class="warn">
					<MkInfo warn>{{ meta.disableInvitationReason }}</MkInfo>
				</div>
				<div class="action">
					<MkButton @click="signup()" inline primary v-if="meta && !(meta.disableRegistration && meta.disableInvitation)">{{ $ts.signup }}</MkButton>
					<MkButton @click="signin()" inline>{{ $ts.login }}</MkButton>
					<MkButton inline style="margin-left: 12px;" @click="explore()">{{ $ts.explore }}</MkButton>
				</div>
				<div class="status" v-if="onlineUsersCount && stats">
					<div>
						<I18n :src="$ts.nUsers" text-tag="span" class="users">
							<template #n><b>{{ number(stats.originalUsersCount) }}</b></template>
						</I18n>
						<I18n :src="$ts.nNotes" text-tag="span" class="notes">
							<template #n><b>{{ number(stats.originalNotesCount) }}</b></template>
						</I18n>
					</div>
					<I18n :src="$ts.onlineUsersCount" text-tag="span" class="online">
						<template #n><b>{{ onlineUsersCount }}</b></template>
					</I18n>
				</div>
				<button class="_button _acrylic menu" @click="showMenu"><Fa :icon="faEllipsisH"/></button>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { faEllipsisH, faInfoCircle, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { toUnicode } from 'punycode';
import XSigninDialog from '@/components/signin-dialog.vue';
import XSignupDialog from '@/components/signup-dialog.vue';
import MkButton from '@/components/ui/button.vue';
import XNote from '@/components/note.vue';
import MkFeaturedPhotos from '@/components/featured-photos.vue';
import XTimeline from './welcome.timeline.vue';
import { host, instanceName } from '@/config';
import * as os from '@/os';
import number from '@/filters/number';
import MkInfo from '@/components/ui/info.vue';

export default defineComponent({
	components: {
		MkButton,
		XNote,
		MkFeaturedPhotos,
		XTimeline,
		MkInfo,
	},

	data() {
		return {
			host: toUnicode(host),
			instanceName,
			meta: null,
			stats: null,
			tags: [],
			onlineUsersCount: null,
			faEllipsisH
		};
	},

	created() {
		os.api('meta', { detail: true }).then(meta => {
			this.meta = meta;
		});

		os.api('stats').then(stats => {
			this.stats = stats;
		});

		os.api('get-online-users-count').then(res => {
			this.onlineUsersCount = res.count;
		});

		os.api('hashtags/list', {
			sort: '+mentionedLocalUsers',
			limit: 8
		}).then(tags => {
			this.tags = tags;
		});
	},

	methods: {
		signin() {
			os.popup(XSigninDialog, {
				autoSet: true
			}, {}, 'closed');
		},

		signup() {
			os.popup(XSignupDialog, {
				autoSet: true
			}, {}, 'closed');
		},

		explore() {
			this.$router.push('/explore')
		},

		showMenu(ev) {
			os.modalMenu([{
				text: this.$t('aboutX', { x: instanceName }),
				icon: faInfoCircle,
				action: () => {
					os.pageWindow('/about');
				}
			}, {
				text: this.$ts.aboutMisskey,
				icon: faInfoCircle,
				action: () => {
					os.pageWindow('/about-misskey');
				}
			}, null, {
				text: this.$ts.help,
				icon: faQuestionCircle,
				action: () => {
					os.pageWindow('/docs');
				}
			}], ev.currentTarget || ev.target);
		},

		number
	}
});
</script>

<style lang="scss" scoped>
.rsqzvsbo {
	> .top {
		display: flex;
		text-align: center;
		min-height: 100vh;
		box-sizing: border-box;
		padding: 16px;

		> .bg {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
		}

		> .tl {
			position: absolute;
			top: 0;
			bottom: 0;
			right: 64px;
			margin: auto;
			width: 500px;
			height: calc(100% - 128px);
			overflow: hidden;
			-webkit-mask-image: linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 128px, rgba(0,0,0,1) calc(100% - 128px), rgba(0,0,0,0) 100%);
			mask-image: linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 128px, rgba(0,0,0,1) calc(100% - 128px), rgba(0,0,0,0) 100%);

			@media (max-width: 1200px) {
				display: none;
			}
		}

		> .shape {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: var(--accent);
			clip-path: polygon(0% 0%, 50% 0%, 15% 100%, 0% 100%);
		}

		> .gplogo {
			position: absolute;
			top: 32px;
			left: 32px;
			height: 72px;
		}

		> .milkeylogo {
			position: absolute;
			top: 38px;
			left: 110px;
			height: 58px;
		}

		> .emojis {
			position: absolute;
			bottom: 32px;
			left: 35px;

			> * {
				margin-right: 8px;
			}

			@media (max-width: 1200px) {
				display: none;
			}
		}

		> .main {
			position: relative;
			width: min(480px, 100%);
			margin: auto auto auto 128px;
			box-shadow: 0 12px 32px rgb(0 0 0 / 25%);

			@media (max-width: 1200px) {
				margin: auto;
			}

			> .bg {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 128px;
				background-position: center;
				background-size: cover;
				opacity: 0.75;

				> .fade {
					position: absolute;
					bottom: 0;
					left: 0;
					width: 100%;
					height: 128px;
					background: linear-gradient(0deg, var(--panel), var(--X15));
				}
			}

			> .fg {
				position: relative;
				z-index: 1;

				> h1 {
					display: block;
					margin: 0;
					padding: 32px 32px 24px 32px;

					> .logo {
						vertical-align: bottom;
						max-height: 120px;
						max-width: min(100%, 300px);
					}
				}

				> .about {
					padding: 0 32px;
				}

				> .warn {
					padding: 32px 32px 0 32px;
				}

				> .action {
					padding: 32px;

					> * {
						line-height: 28px;
					}
				}

				> .status {
					border-top: solid 1px var(--divider);
					padding: 32px;
					font-size: 90%;

					> div {
						> span:not(:last-child) {
							padding-right: 1em;
							margin-right: 1em;
							border-right: solid 1px var(--divider);
						}
					}

					> .online {
						::v-deep(b) {
							color: #41b781;
						}

						::v-deep(span) {
							opacity: 0.7;
						}
					}
				}

				> .menu {
					position: absolute;
					top: 16px;
					right: 16px;
					width: 32px;
					height: 32px;
					border-radius: 8px;
				}
			}
		}
	}
}
</style>
