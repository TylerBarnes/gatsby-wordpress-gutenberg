/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useEffect,
	useContext,
	useState,
	createContext,
	useCallback,
} from '@wordpress/element';
import { useRegistry, useDispatch, useSelect } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { Toolbar, Button } from '@wordpress/components';
import {
	BlockControls,
	// InspectorControls
} from '@wordpress/block-editor';

import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';

import { debounce } from 'lodash';
import styled from 'styled-components';

import BlockPreview from './block-preview';
import { postBatch, fetchPreviewUrl } from './gatsby';
import PreviewIcon from './preview-icon';

import './store';

const CoreBlockContext = createContext(null);

const usePreview = () => {
	return {
		enabled:
			window.wpGatsbyGutenberg && window.wpGatsbyGutenberg.previewEnabled,
	};
};

addFilter(
	`editor.BlockEdit`,
	`plugin-wp-gatsby-gutenberg-preview/BlockEdit`,
	(Edit) => {
		return (props) => {
			const registry = useRegistry();
			const blocks = registry.select(`core/block-editor`).getBlocks();
			const coreBlock = useContext(CoreBlockContext);

			const id = useSelect(
				(select) => select(`core/editor`).getCurrentPostId(),
				[]
			);
			const slug = useSelect(
				(select) =>
					select(`core/editor`).getEditedPostAttribute(`slug`),
				[]
			);
			const link = useSelect(
				(select) =>
					select(`core/editor`).getEditedPostAttribute(`link`),
				[]
			);

			const { setBlocks } = useDispatch(`wp-gatsby-gutenberg/preview`);

			const coreBlockId =
				(coreBlock &&
					coreBlock.attributes.ref &&
					parseInt(coreBlock.attributes.ref, 10)) ||
				null;

			useEffect(() => {
				if (id) {
					setBlocks({ id, blocks, coreBlockId, slug, link });
				}
			}, [blocks, coreBlockId, id]);

			const [showPreview, setShowPreview] = useState(false);

			const { enabled } = usePreview();

			if (props.name === `core/block`) {
				return (
					<CoreBlockContext.Provider value={props}>
						<Edit {...props}></Edit>
					</CoreBlockContext.Provider>
				);
			}

			if (enabled) {
				return (
					<>
						{showPreview ? (
							<BlockPreview {...props} />
						) : (
							<Edit {...props} />
						)}
						<BlockControls>
							<Toolbar>
								<Button
									className="components-toolbar__control"
									label={__('Gatsby Preview')}
									onClick={() => {
										setShowPreview(!showPreview);
									}}
								>
									<PreviewIcon active={showPreview} />
								</Button>
							</Toolbar>
						</BlockControls>
					</>
				);
			}

			return <Edit {...props} />;
		};
	}
);

const PreviewButton = styled(Button)`
	&& {
		&:not([disabled]) {
			background-color: #663399;
			border-color: #663399;
			color: white;

			:hover {
				background-color: #4d2673;
				border-color: #402060;
			}
		}
	}
`;

const noIcon = () => null;

const GatsbyWordpressGutenbergPreview = () => {
	const [previewUrl, setPreviewUrl] = useState(null);

	const { enabled } = usePreview();

	const id = useSelect(
		(select) => select(`core/editor`).getCurrentPostId(),
		[]
	);

	const sendBatch = useCallback(
		debounce(({ batch }) => {
			postBatch({
				batch,
			}).then(() => {
				if (enabled) {
					fetchPreviewUrl({ id }).then(({ url }) => {
						setPreviewUrl(url);
					});
				}
			});
		}, 500),
		[enabled, id]
	);

	const batch = useSelect((select) =>
		select(`wp-gatsby-gutenberg/preview`).getBatch()
	);

	useEffect(() => {
		sendBatch({ batch });
	}, [sendBatch, batch]);

	if (enabled) {
		return (
			<PluginDocumentSettingPanel
				name="custom-panel"
				title={__('Gatsby Gutenberg Preview', 'wp-gatsby-gutenberg')}
				icon={noIcon}
			>
				<PreviewButton
					disabled={!previewUrl}
					href={previewUrl}
					target="_blank"
					isLarge
				>
					{__('Preview', 'wp-gatsby-gutenberg')}
				</PreviewButton>
			</PluginDocumentSettingPanel>
		);
	}

	return null;
};

registerPlugin(`plugin-wp-gatsby-gutenberg-preview`, {
	render: GatsbyWordpressGutenbergPreview,
});
