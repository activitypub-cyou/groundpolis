<template>
<span v-if="disableIfFollowing && isFollowing">
	{{ $ts.following2 }}
</span>
<button class="kpoogebi _button"
	:class="{ wait, active: isFollowing || hasPendingFollowRequestFromYou, full, large }"
	@click="onClick"
	:disabled="wait"
	v-else
	v-cloak
>
	<template v-if="!wait">
		<template v-if="hasPendingFollowRequestFromYou && user.isLocked">
			<span v-if="full">{{ $ts.followRequestPending }}</span><Fa :icon="faHourglassHalf"/>
		</template>
		<template v-else-if="hasPendingFollowRequestFromYou && !user.isLocked"> <!-- つまりリモートフォローの場合。 -->
			<span v-if="full">{{ $ts.processing }}</span><Fa :icon="faSpinner" pulse/>
		</template>
		<template v-else-if="isFollowing">
			<span v-if="full">{{ $ts.unfollow }}</span><Fa :icon="faMinus"/>
		</template>
		<template v-else-if="!isFollowing && user.isLocked">
			<span v-if="full">{{ $ts.followRequest }}</span><Fa :icon="faPlus"/>
		</template>
		<template v-else-if="!isFollowing && !user.isLocked">
			<span v-if="full">{{ $ts.follow }}</span><Fa :icon="faPlus"/>
		</template>
	</template>
	<template v-else>
		<span v-if="full">{{ $ts.processing }}</span><Fa :icon="faSpinner" pulse fixed-width/>
	</template>
</button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { faSpinner, faPlus, faMinus, faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import * as os from '@/os';

export default defineComponent({
	props: {
		user: {
			type: Object,
			required: true
		},
		full: {
			type: Boolean,
			required: false,
			default: false,
		},
		disableIfFollowing: {
			type: Boolean,
			required: false,
			default: false,
		},
		large: {
			type: Boolean,
			required: false,
			default: false,
		},
	},

	data() {
		return {
			isFollowing: this.user.isFollowing,
			hasPendingFollowRequestFromYou: this.user.hasPendingFollowRequestFromYou,
			wait: false,
			connection: null,
			faSpinner, faPlus, faMinus, faHourglassHalf
		};
	},

	created() {
		// 渡されたユーザー情報が不完全な場合
		if (this.user.isFollowing == null) {
			os.api('users/show', {
				userId: this.user.id
			}).then(u => {
				this.isFollowing = u.isFollowing;
				this.hasPendingFollowRequestFromYou = u.hasPendingFollowRequestFromYou;
			});
		}
	},

	mounted() {
		this.connection = os.stream.useSharedConnection('main');

		this.connection.on('follow', this.onFollowChange);
		this.connection.on('unfollow', this.onFollowChange);
	},

	beforeUnmount() {
		this.connection.dispose();
	},

	methods: {
		onFollowChange(user) {
			if (user.id == this.user.id) {
				this.isFollowing = user.isFollowing;
				this.hasPendingFollowRequestFromYou = user.hasPendingFollowRequestFromYou;
			}
		},

		async onClick() {
			this.wait = true;

			try {
				if (this.isFollowing) {
					const canceled = this.$store.state.showUnfollowConfirm && (await os.dialog({
						type: 'warning',
						text: this.$t('unfollowConfirm', { name: this.user.name || this.user.username }),
						showCancelButton: true
					})).canceled;
					if (canceled) return;

					await os.api('following/delete', {
						userId: this.user.id
					});
				} else {
					if (this.hasPendingFollowRequestFromYou) {
						await os.api('following/requests/cancel', {
							userId: this.user.id
						});
					} else if (this.user.isLocked) {
						const canceled = this.$store.state.showFollowConfirm && (await os.dialog({
							type: 'warning',
							text: this.$t('followRequestConfirm', { name: this.user.name || this.user.username }),
							showCancelButton: true
						})).canceled;
						if (canceled) return;

						await os.api('following/create', {
							userId: this.user.id
						});
						this.hasPendingFollowRequestFromYou = true;
					} else {
						const canceled = this.$store.state.showFollowConfirm && (await os.dialog({
							type: 'warning',
							text: this.$t('followConfirm', { name: this.user.name || this.user.username }),
							showCancelButton: true
						})).canceled;
						if (canceled) return;
						await os.api('following/create', {
							userId: this.user.id
						});
						this.hasPendingFollowRequestFromYou = true;
					}
				}
			} catch (e) {
				console.error(e);
			} finally {
				this.wait = false;
			}
		}
	}
});
</script>

<style lang="scss" scoped>
.kpoogebi {
	position: relative;
	display: inline-block;
	font-weight: bold;
	color: var(--accent);
	padding: 0;
	height: 31px;
	font-size: 16px;
	border-radius: 32px;
	background: #fff;

	&.full {
		padding: 0 8px 0 12px;
		font-size: 14px;
	}

	&.large {
		font-size: 16px;
		height: 38px;
		padding: 0 12px 0 16px;
	}

	&:not(.full) {
		width: 31px;
	}

	&:focus {
		&:after {
			content: "";
			pointer-events: none;
			position: absolute;
			top: -5px;
			right: -5px;
			bottom: -5px;
			left: -5px;
			border: 2px solid var(--focus);
			border-radius: 32px;
		}
	}

	&:hover {
		//background: mix($primary, #fff, 20);
	}

	&:active {
		//background: mix($primary, #fff, 40);
	}

	&.active {
		color: #fff;
		background: linear-gradient(45deg, var(--buttonGradateA), var(--buttonGradateB));

		&:hover {
			background: var(--accentLighten);
			border-color: var(--accentLighten);
		}

		&:active {
			background: var(--accentDarken);
			border-color: var(--accentDarken);
		}
	}

	&.wait {
		cursor: wait !important;
		opacity: 0.7;
	}

	> span {
		margin-right: 6px;
	}
}
</style>
