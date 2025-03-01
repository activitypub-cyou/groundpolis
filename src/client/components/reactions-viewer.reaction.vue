<template>
<button
	class="hkzvhatu _button"
	:class="{ reacted: note.myReaction == reaction, canToggle }"
	@click="toggleReaction(reaction)"
	v-if="count > 0"
	@touchstart.passive="onMouseover"
	@mouseover="onMouseover"
	@mouseleave="onMouseleave"
	@touchend="onMouseleave"
	ref="reaction"
	v-particle="canToggle"
>
	<XReactionIcon :reaction="reaction" :custom-emojis="note.emojis"/>
	<span>{{ count }}</span>
</button>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import XDetails from '@/components/reactions-viewer.details.vue';
import XReactionIcon from '@/components/reaction-icon.vue';
import * as os from '@/os';

export default defineComponent({
	components: {
		XReactionIcon
	},
	props: {
		reaction: {
			type: String,
			required: true,
		},
		count: {
			type: Number,
			required: true,
		},
		isInitial: {
			type: Boolean,
			required: true,
		},
		note: {
			type: Object,
			required: true,
		},
		preview: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			close: null,
			detailsTimeoutId: null,
			isHovering: false
		};
	},
	computed: {
		canToggle(): boolean {
			return !this.reaction.match(/@\w/) && this.$i;
		},
	},
	watch: {
		count(newCount, oldCount) {
			if (oldCount < newCount) this.anime();
			if (this.close != null) this.openDetails();
		},
	},
	mounted() {
		if (!this.isInitial) this.anime();
	},
	methods: {
		toggleReaction() {
			if (!this.canToggle) return;

			const oldReaction = this.note.myReaction;
			if (oldReaction) {
				os.api('notes/reactions/delete', {
					noteId: this.note.id
				}).then(() => {
					if (oldReaction !== this.reaction) {
						os.api('notes/reactions/create', {
							noteId: this.note.id,
							reaction: this.reaction
						});
					}
				});
			} else {
				os.api('notes/reactions/create', {
					noteId: this.note.id,
					reaction: this.reaction
				});
			}
		},
		onMouseover() {
			if (this.preview) return;
			if (this.isHovering) return;
			this.isHovering = true;
			this.detailsTimeoutId = setTimeout(this.openDetails, 300);
		},
		onMouseleave() {
			if (this.preview) return;
			if (!this.isHovering) return;
			this.isHovering = false;
			clearTimeout(this.detailsTimeoutId);
			this.closeDetails();
		},
		openDetails() {
			os.api('notes/reactions', {
				noteId: this.note.id,
				type: this.reaction,
				limit: 11
			}).then((reactions: any[]) => {
				const users = reactions
					.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
					.map(x => x.user);

				this.closeDetails();
				if (!this.isHovering) return;

				const showing = ref(true);
				os.popup(XDetails, {
					showing,
					reaction: this.reaction,
					emojis: this.note.emojis,
					users,
					count: this.count,
					source: this.$refs.reaction
				}, {}, 'closed');

				this.close = () => {
					showing.value = false;
				};
			});
		},
		closeDetails() {
			if (this.close != null) {
				this.close();
				this.close = null;
			}
		},
		anime() {
			if (document.hidden) return;

			// TODO
		},
	}
});
</script>

<style lang="scss" scoped>
.hkzvhatu {
	display: inline-block;
	height: 32px;
	margin: 2px;
	padding: 0 6px;
	border-radius: 4px;

	&.canToggle {
		background: var(--reaction);
		box-shadow: var(--reactionShadow);

		&:hover {
			background: rgba(0, 0, 0, 0.1);
		}
	}

	&:not(.canToggle) {
		cursor: default;
	}

	&.reacted {
		background: var(--reacted);
		box-shadow: var(--reactedShadow);

		&:hover {
			background: var(--accent);
		}

		> span {
			color: #fff;
		}
	}

	> span {
		font-size: 0.9em;
		line-height: 32px;
	}
}
</style>
