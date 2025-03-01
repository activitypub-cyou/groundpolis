<template>
<div class="mk-app" :class="{ wallpaper }">
	<XSidebar ref="nav" class="sidebar"/>

	<div class="contents" ref="contents" :class="{ withHeader: $store.state.titlebar }" @contextmenu.stop="onContextmenu">
		<header v-if="$store.state.titlebar" class="header" ref="header" @contextmenu.stop="onContextmenu" @click="onHeaderClick">
			<XHeader main
				:info="pageInfo"
				:withWidgetButton="!isDesktop"
				:withMenuButton="navHidden"
				:menuButtonIndicate="navIndicated"
				@menuButtonClicked="showNav"
				@widgetButtonClicked="widgetsShowing = true"
			/>
		</header>
		<main ref="main">
			<div class="content">
				<router-view v-slot="{ Component }">
					<transition :name="$store.state.animation ? 'page' : ''" mode="out-in" @enter="onTransition">
						<keep-alive :include="['timeline']">
							<component :is="Component" :ref="changePage"/>
						</keep-alive>
					</transition>
				</router-view>
			</div>
			<div class="spacer"></div>
		</main>
	</div>

	<XSide v-if="isDesktop" class="side" ref="side"/>

	<div v-if="isDesktop" class="widgets">
		<div ref="widgetsSpacer"></div>
		<XWidgets @mounted="attachSticky"/>
	</div>

	<div class="bottom-bar" :class="{ navHidden }">
		<button v-if="$route.name === 'index'" class="button home _button active" @click="top()">
			<Fa :icon="faHome"/>
		</button>
		<button v-else class="button home _button" @click="$router.push('/')">
			<Fa :icon="faHome"/>
		</button>
		<button class="button explore _button" :class="{ active: $route.name === 'explore' }" @click="$router.push('/explore')">
			<Fa :icon="faHashtag"/>
		</button>
		<button class="button notifications _button" :class="{ active: $route.name === 'notifications' }" @click="$router.push('/my/notifications')">
			<Fa :icon="faBell"/><i v-if="$i.hasUnreadNotification"><Fa :icon="faCircle"/></i>
		</button>
		<button class="button chat _button" :class="{ active: $route.name === 'messaging' }" @click="$router.push('/my/messaging')">
			<Fa :icon="faComments"/><i v-if="$i.hasUnreadMessagingMessage"><Fa :icon="faCircle"/></i>
		</button>
	</div>

	<button class="fab _button" :class="{ navHidden }" v-if="fabIcon" @click="onFabClicked"><Fa :key="fabIcon" :icon="fabIcon"/></button>

	<transition name="tray-back">
		<div class="tray-back _modalBg"
			v-if="widgetsShowing"
			@click="widgetsShowing = false"
			@touchstart.passive="widgetsShowing = false"
		></div>
	</transition>

	<transition name="tray">
		<XWidgets v-if="widgetsShowing" class="tray"/>
	</transition>

	<iframe v-if="$store.state.aiChanMode" class="ivnzpscs" ref="live2d" src="https://misskey-dev.github.io/mascot-web/?scale=2&y=1.4"></iframe>

	<XCommon/>
</div>
</template>

<script lang="ts">
import { defineComponent, defineAsyncComponent, markRaw } from 'vue';
import { faLayerGroup, faBars, faHome, faCircle, faWindowMaximize, faColumns, faHashtag, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { faBell, faComments } from '@fortawesome/free-regular-svg-icons';
import { host } from '@/config';
import { instanceName } from '@/config';
import { StickySidebar } from '@/scripts/sticky-sidebar';
import XSidebar from '@/components/sidebar.vue';
import XCommon from './_common_/common.vue';
import XHeader from './_common_/header.vue';
import XSide from './default.side.vue';
import * as os from '@/os';
import { sidebarDef } from '@/sidebar';

const DESKTOP_THRESHOLD = 1100;

export default defineComponent({
	components: {
		XCommon,
		XSidebar,
		XHeader,
		XWidgets: defineAsyncComponent(() => import('./default.widgets.vue')),
		XSide, // NOTE: dynamic importするとAsyncComponentWrapperが間に入るせいでref取得できなくて面倒になる
	},

	provide() {
		return {
			sideViewHook: this.isDesktop ? (url) => {
				this.$refs.side.navigate(url);
			} : null
		};
	},

	data() {
		return {
			pageInfo: null,
			isDesktop: window.innerWidth >= DESKTOP_THRESHOLD,
			menuDef: sidebarDef,
			navHidden: false,
			widgetsShowing: false,
			wallpaper: localStorage.getItem('wallpaper') != null,
			faLayerGroup, faBars, faBell, faHome, faCircle, faHashtag, faComments,
		};
	},

	computed: {
		navIndicated(): boolean {
			for (const def in this.menuDef) {
				if (def === 'notifications') continue; // 通知は下にボタンとして表示されてるから
				if (this.menuDef[def].indicated) return true;
			}
			return false;
		},

		fabIcon() {
			return this.pageInfo && this.pageInfo.action ? this.pageInfo.action.icon : null;
		},
	},

	created() {
		document.documentElement.style.overflowY = 'scroll';

		if (this.$store.state.widgets.length === 0) {
			this.$store.set('widgets', [{
				name: 'calendar',
				id: 'a', place: 'right', data: {}
			}, {
				name: 'notifications',
				id: 'b', place: 'right', data: {}
			}, {
				name: 'trends',
				id: 'c', place: 'right', data: {}
			}]);
		}
	},

	mounted() {
		this.adjustUI();

		const ro = new ResizeObserver((entries, observer) => {
			this.adjustUI();
			this.isDesktop = window.innerWidth >= DESKTOP_THRESHOLD;
		});

		ro.observe(this.$refs.contents);

		window.addEventListener('resize', this.adjustUI, { passive: true });

		if (this.$store.state.aiChanMode) {
			let iframeRect = this.$refs.live2d.getBoundingClientRect();
			window.addEventListener('mousemove', ev => {
				this.$refs.live2d.contentWindow.postMessage({
					type: 'moveCursor',
					body: {
						x: ev.clientX - iframeRect.left,
						y: ev.clientY - iframeRect.top,
					}
				}, '*');
			}, { passive: true });
		}
	},

	methods: {
		changePage(page) {
			if (page == null) return;
			if (page.INFO) {
				this.pageInfo = page.INFO;
				document.title =
					this.pageInfo.title
						? `${this.pageInfo.title} | ${instanceName}`
						: instanceName;
			}
		},

		adjustUI() {
			const navWidth = this.$refs.nav.$el.offsetWidth;
			this.navHidden = navWidth <= 1;
			if (this.$refs.contents == null) return;
			const width = this.$refs.contents.offsetWidth;
			if (this.$refs.header) this.$refs.header.style.width = `${width}px`;
		},

		showNav() {
			this.$refs.nav.show();
		},

		attachSticky(el) {
			const sticky = new StickySidebar(el, this.$refs.widgetsSpacer);
			window.addEventListener('scroll', () => {
				sticky.calc(window.scrollY);
			}, { passive: true });
		},

		post() {
			os.post();
		},

		top() {
			window.scroll({ top: 0, behavior: 'smooth' });
		},

		onTransition() {
			if (window._scroll) window._scroll();
		},

		onHeaderClick() {
			window.scroll({ top: 0, behavior: 'smooth' });
		},

		onContextmenu(e) {
			const isLink = (el: HTMLElement) => {
				if (el.tagName === 'A') return true;
				if (el.parentElement) {
					return isLink(el.parentElement);
				}
			};
			if (isLink(e.target)) return;
			if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.attributes['contenteditable']) return;
			if (window.getSelection().toString() !== '') return;
			const path = this.$route.path;
			os.contextMenu([{
				type: 'label',
				text: path,
			}, {
				icon: faColumns,
				text: this.$ts.openInSideView,
				action: () => {
					this.$refs.side.navigate(path);
				}
			}, {
				icon: faWindowMaximize,
				text: this.$ts.openInWindow,
				action: () => {
					os.pageWindow(path);
				}
			}], e);
		},

		onFabClicked(e) {
			if (this.pageInfo && this.pageInfo.action) {
				this.pageInfo.action.handler(e);
			} else {
				os.post();
			}
		},

		onAiClick(ev) {
			//if (this.live2d) this.live2d.click(ev);
		}
	}
});
</script>

<style lang="scss" scoped>
.tray-enter-active,
.tray-leave-active {
	opacity: 1;
	transform: translateX(0);
	transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1), opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
.tray-enter-from,
.tray-leave-active {
	opacity: 0;
	transform: translateX(240px);
}

.tray-back-enter-active,
.tray-back-leave-active {
	opacity: 1;
	transition: opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
.tray-back-enter-from,
.tray-back-leave-active {
	opacity: 0;
}

.mk-app {
	$header-height: 58px; // TODO: どこかに集約したい
	$ui-font-size: 1em; // TODO: どこかに集約したい
	$widgets-hide-threshold: 1100px;

	// ほんとは単に 100vh と書きたいところだが... https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
	min-height: calc(var(--vh, 1vh) * 100);
	box-sizing: border-box;
	display: flex;

	&.wallpaper {
		background: var(--wallpaperOverlay);
		//backdrop-filter: blur(4px);
	}

	> .contents {
		width: 100%;
		min-width: 0;

		&.withHeader {
			padding-top: $header-height;
		}

		> .header {
			position: fixed;
			z-index: 1000;
			top: 0;
			height: $header-height;
			width: 100%;
			line-height: $header-height;
			text-align: center;
			font-weight: bold;
			//background-color: var(--panel);
			-webkit-backdrop-filter: blur(32px);
			backdrop-filter: blur(32px);
			background-color: var(--header);
			border-bottom: solid 1px var(--divider);
			user-select: none;
		}

		> main {
			min-width: 0;

			> .content {
				> * {
					// ほんとは単に calc(100vh - #{$header-height}) と書きたいところだが... https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
					min-height: calc((var(--vh, 1vh) * 100) - #{$header-height});
				}
			}

			> .spacer {
				height: 82px;

				@media (min-width: ($widgets-hide-threshold + 1px)) {
					display: none;
				}
			}
		}
	}

	> .side {
		min-width: 370px;
		max-width: 370px;
		border-left: solid 1px var(--divider);
	}

	> .widgets {
		padding: 0 var(--margin);
		border-left: solid 1px var(--divider);

		@media (max-width: $widgets-hide-threshold) {
			display: none;
		}
	}

	> .fab {
		display: block;
		position: fixed;
		z-index: 1000;
		right: calc(32px + var(--margin) * 2 + 300px);
		bottom: 32px;
		width: 64px;
		height: 64px;
		border-radius: 100%;
		box-shadow: var(--panelShadow);
		font-size: 22px;
		color: white;
		background: linear-gradient(45deg, var(--buttonGradateA), var(--buttonGradateB));

		&.navHidden {
			bottom: 64px;
		}

		@supports (bottom: env(safe-area-inset-bottom)) {
			bottom: calc(32px + env(safe-area-inset-bottom));

			&.navHidden {
				bottom: calc(64px + env(safe-area-inset-bottom));
			}
		}

		@media (max-width: $widgets-hide-threshold) {
			right: 32px;
		}
	}

	> .buttons {
		position: fixed;
		z-index: 1000;
		bottom: 0;
		padding: 16px;
		display: flex;
		width: 100%;
		box-sizing: border-box;
		-webkit-backdrop-filter: blur(32px);
		backdrop-filter: blur(32px);
		background-color: var(--header);

		&:not(.navHidden) {
			display: none;
		}

		> .button {
			position: relative;
			flex: 1;
			padding: 0;
			margin: auto;
			height: 64px;
			border-radius: 8px;
			background: var(--panel);
			color: var(--fg);

			&:not(:last-child) {
				margin-right: 12px;
			}

			@media (max-width: 400px) {
				height: 60px;

				&:not(:last-child) {
					margin-right: 8px;
				}
			}

			&:hover {
				background: var(--X2);
			}

			> i {
				position: absolute;
				top: 0;
				left: 0;
				color: var(--indicator);
				font-size: 16px;
				animation: blink 1s infinite;
			}

			&:first-child {
				margin-left: 0;
			}

			&:last-child {
				margin-right: 0;
			}

			> * {
				font-size: 22px;
			}

			&:disabled {
				cursor: default;

				> * {
					opacity: 0.5;
				}
			}
		}
	}

	> .bottom-bar {
		position: fixed;
		z-index: 1000;
		bottom: 0;
		padding: 0 16px;
		display: flex;
		width: 100%;
		box-sizing: border-box;
		background: var(--panel);
		padding-bottom: env(safe-area-inset-bottom);
		box-shadow: 0 0 16px rgba(0, 0, 0, 0.5);
		&:not(.navHidden) {
			display: none;
		}
		> .button {
			position: relative;
			padding: 0;
			margin: 0;
			width: 100%;
			height: 48px;
			background: var(--panel);
			color: var(--fg);

			> i {
				position: absolute;
				top: 0;
				left: 0;
				color: var(--indicator);
				font-size: 16px;
				animation: blink 1s infinite;
			}

			> * {
				font-size: 16px;
			}

			&.active {
				background: var(--X2);
				border-top: 2px solid var(--accent);
			}

			&:disabled {
				cursor: default;
				> * {
					opacity: 0.5;
				}
			}
		}
	}

	> .tray-back {
		z-index: 1001;
	}

	> .tray {
		position: fixed;
		top: 0;
		right: 0;
		z-index: 1001;
		// ほんとは単に 100vh と書きたいところだが... https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
		height: calc(var(--vh, 1vh) * 100);
		padding: var(--margin);
		box-sizing: border-box;
		overflow: auto;
		background: var(--bg);
	}

	> .ivnzpscs {
		position: fixed;
		bottom: 0;
		right: 0;
		width: 300px;
		height: 600px;
		border: none;
		pointer-events: none;
	}
}
</style>

<style lang="scss">
</style>
