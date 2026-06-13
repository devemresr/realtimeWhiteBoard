import { SVGProps } from 'react';

export const PointerSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M3.357 3.234a1 1 0 0 1 1.103-.122l16.325 8.455a1 1 0 0 1-.148 1.838l-6.854 2.254-3.41 6.359a1 1 0 0 1-1.836-.174L3.046 4.3a1 1 0 0 1 .311-1.065Zm2.314 2.758 4.064 12.983 2.474-4.614a1 1 0 0 1 .57-.478l4.973-1.635-12.08-6.256Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const PenSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M3.292 3.294a1 1 0 0 1 1.102-.213l6.3 2.7 7.7 3.3c.117.05.223.122.313.212l3 3a1 1 0 1 1-1.414 1.414l-2.287-2.287-6.522 6.638 2.225 2.237a1 1 0 1 1-1.418 1.41L9.37 18.768a1.001 1.001 0 0 1-.21-.308l-3.361-7.78-2.716-6.283a1 1 0 0 1 .21-1.103Zm7.114 13.008 5.855-5.96-5.733-2.456-2.625 2.625 2.503 5.791ZM7.05 8.536l1.499-1.499-2.635-1.129L7.05 8.536Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const HandSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M11.207 3.68c-.116.174-.207.468-.207.82V11a1 1 0 1 1-2 0V6c0-.352-.09-.646-.207-.82C8.697 5.035 8.613 5 8.5 5c-.112 0-.197.035-.293.18C8.091 5.354 8 5.648 8 6v9a1 1 0 1 1-2 0v-3c0-.352-.09-.646-.207-.82-.096-.145-.18-.18-.293-.18-.112 0-.197.035-.293.18-.116.174-.207.468-.207.82v4c0 1.033.7 2.14 2.055 3.043C8.387 19.932 10.194 20.5 12 20.5c3.668 0 6-2.249 6-4.5V9c0-.352-.09-.646-.207-.82-.096-.145-.18-.18-.293-.18-.112 0-.197.035-.293.18-.116.174-.207.468-.207.82v3a1 1 0 1 1-2 0V6c0-.352-.09-.646-.207-.82-.096-.145-.18-.18-.293-.18-.112 0-.197.035-.293.18-.116.174-.207.468-.207.82v5a1 1 0 1 1-2 0V4.5c0-.352-.09-.646-.207-.82-.096-.145-.18-.18-.293-.18-.112 0-.197.035-.293.18Zm2.538-.558c.23-.078.482-.122.755-.122.888 0 1.553.465 1.957 1.07.384.576.543 1.282.543 1.93v.052c.158-.034.325-.052.5-.052.888 0 1.553.465 1.957 1.07.384.576.543 1.282.543 1.93v7c0 3.749-3.668 6.5-8 6.5-2.194 0-4.388-.681-6.055-1.793C4.3 19.61 3 17.967 3 16v-4c0-.648.16-1.354.543-1.93C3.947 9.465 4.613 9 5.5 9c.175 0 .342.018.5.052V6c0-.648.16-1.354.543-1.93C6.947 3.465 7.613 3 8.5 3c.273 0 .525.044.755.122.077-.192.172-.378.288-.552.404-.605 1.07-1.07 1.957-1.07.888 0 1.553.465 1.957 1.07.116.174.211.36.288.552Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const ImageSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm16 0v8.586l-3.293-3.293a1 1 0 0 0-1.414 0L13 12.586 9.207 8.793a1 1 0 0 0-1.414 0L5 11.586V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1ZM5 18v-3.586l3.5-3.5 3.793 3.793a1 1 0 0 0 1.414 0L15 13.414l4 4V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Zm9.5-8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const StarSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M10.853 4.131c.435-1.003 1.859-1.003 2.294 0l1.98 4.566 4.954.472c1.088.103 1.528 1.457.708 2.181l-3.73 3.294 1.082 4.857c.238 1.068-.914 1.904-1.856 1.348L12 18.32l-4.285 2.53c-.942.556-2.094-.28-1.856-1.348l1.082-4.857-3.73-3.294c-.82-.724-.38-2.078.709-2.181l4.953-.472 1.98-4.566ZM12 6.514l-1.527 3.52-.234.542-.588.056-3.82.364 2.876 2.54.443.39-.128.576-.835 3.746 3.305-1.951.508-.3.508.3 3.305 1.95-.835-3.745-.128-.576.443-.39 2.876-2.54-3.82-.364-.588-.056-.234-.542L12 6.514Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const SquareSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm4-2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H8Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const TriangleSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M12 5.944 4.766 18h14.468L12 5.944ZM10.714 4.2a1.5 1.5 0 0 1 2.572 0l8.117 13.528A1.5 1.5 0 0 1 20.117 20H3.883a1.5 1.5 0 0 1-1.286-2.272L10.714 4.2Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const CircleSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-9 7a9 9 0 1 1 18 0 9 9 0 0 1-18 0Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const TextSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V6h-6v13h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2V6H5v1a1 1 0 0 1-2 0V5Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const ItalicSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M8 6a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2h-2.142l-1.692 11H13a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h2.142l1.692-11H9a1 1 0 0 1-1-1Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const BoldSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M9 7v4h4a2 2 0 1 0 0-4H9Zm6.937 4.716A4 4 0 0 0 13 5H8.5A1.5 1.5 0 0 0 7 6.5v12A1.5 1.5 0 0 0 8.5 20h5a4.5 4.5 0 0 0 2.437-8.284ZM13 13H9v5h4.5a2.5 2.5 0 0 0 0-5H13Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const UnderlineSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M7 5a1 1 0 0 1 1 1v6a4 4 0 0 0 8 0V6a1 1 0 1 1 2 0v6a6 6 0 0 1-12 0V6a1 1 0 0 1 1-1ZM6 20a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const LineSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M18 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-3 1a3 3 0 1 1 1.707 2.707l-8 8a3 3 0 1 1-1.414-1.414l8-8A2.99 2.99 0 0 1 15 6ZM6 17a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const PaintSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='m18.264 11.646-7.072-7.071L9.446 6.32l7.07 7.072 1.748-1.747Zm-14.85.707 4.618-4.617 7.07 7.07-4.617 4.618-7.07-7.07Zm13.81 3.16 2.17-2.17.046.095.616 1.26c-.225.965-.465 1.607-.659 2.126-.23.619-.397 1.064-.397 1.676 0 1.173.5 2 1.5 2s1.5-.5 1.5-2c0-.612-.166-1.057-.397-1.676-.15-.402-.329-.879-.506-1.522l.236-2.196c.166-1.54.1-3.114-.902-4.263-.49-.563-.873-.783-1.404-1.087-.177-.101-.37-.212-.59-.348-.98-.609-2.8-1.862-6.606-5.017a1 1 0 0 0-1.346.063l-3.16 3.16-6.032 6.032a1 1 0 0 0 0 1.414l8.485 8.486a1 1 0 0 0 1.414 0l6.032-6.032Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const EraserSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		stroke={color}
		strokeWidth={0.272}
		className='bi bi-eraser'
		viewBox='0 0 16 16'
		{...props}
	>
		<path d='M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm2.121.707a1 1 0 0 0-1.414 0L4.16 7.547l5.293 5.293 4.633-4.633a1 1 0 0 0 0-1.414l-3.879-3.879zM8.746 13.547 3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z' />
	</svg>
);

export const ColorPickerSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M3.368 4.368a2.5 2.5 0 0 0 0 3.536l3.182 3.182-2.121 2.121a1 1 0 1 0 1.414 1.414l1.414-1.414 6.01 6.01a1.5 1.5 0 0 0 1.708.294l1.121 1.12a2.5 2.5 0 0 0 3.536-3.535l-1.121-1.12a1.5 1.5 0 0 0-.293-1.708l-6.01-6.01 1.413-1.415a1 1 0 1 0-1.414-1.414L10.086 7.55 6.904 4.368a2.5 2.5 0 0 0-3.536 0Zm7.425 5.304-2.121 2.12 5.717 5.718a1.5 1.5 0 0 1 1.707.293l1.414 1.415a.5.5 0 1 0 .707-.708l-1.414-1.414a1.5 1.5 0 0 1-.293-1.707l-5.717-5.717Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const TrashSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1h4a1 1 0 1 1 0 2h-1v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8H5a1 1 0 0 1 0-2h4V5Zm1 3H8v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8h-6Zm3-2h-2V5h2v1Zm-3 3a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const MenuSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M4 5a1 1 0 0 0 0 2h16a1 1 0 1 0 0-2H4Zm-1 7a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 6a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const FolderSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M1 5a3 3 0 0 1 3-3h4.558a3 3 0 0 1 2.847 2.051L11.72 5H20a2 2 0 0 1 2 2v2.01a2 2 0 0 1 1.77 2.348l-1.637 9A2 2 0 0 1 20.165 22H3a2 2 0 0 1-2-2V5Zm19 4V7h-8.28a2 2 0 0 1-1.897-1.368l-.316-.948A1 1 0 0 0 8.558 4H4a1 1 0 0 0-1 1v7.27l.354-1.682A2 2 0 0 1 5.311 9H20ZM3.366 20a.998.998 0 0 0 .113-.294L5.31 11h16.491l-1.637 9H3.366Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const DownloadSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M8 10a4 4 0 1 1 8 0v1h1a3.5 3.5 0 1 1 0 7h-.1a1 1 0 1 0 0 2h.1a5.5 5.5 0 0 0 .93-10.922 6.001 6.001 0 0 0-11.86 0A5.502 5.502 0 0 0 7 20h.1a1 1 0 1 0 0-2H7a3.5 3.5 0 1 1 0-7h1v-1Zm5 1a1 1 0 1 0-2 0v5.586l-1.293-1.293a1 1 0 0 0-1.414 1.414l3 3a1 1 0 0 0 1.414 0l3-3a1 1 0 0 0-1.414-1.414L13 16.586V11Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const UserSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M8 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm7.824 4.623a6 6 0 1 0-7.649 0C4.986 14.746 3 17.247 3 20a1 1 0 1 0 2 0c0-2.27 2.355-5 7-5s7 2.73 7 5a1 1 0 1 0 2 0c0-2.753-1.984-5.254-5.176-6.377Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const UsersSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<g
			stroke={color}
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth={2}
		>
			<circle cx={9} cy={9} r={4} />
			<path d='M16 19c0-3.314-3.134-6-7-6s-7 2.686-7 6M15 13a4 4 0 1 0-3-6.646' />
			<path d='M22 19c0-3.314-3.134-6-7-6-.807 0-2.103-.293-3-1.235' />
		</g>
	</svg>
);

export const InfoSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12Zm12.25-4.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0ZM11 10a1 1 0 1 0 0 2v5a1 1 0 1 0 2 0v-6a1 1 0 0 0-1-1h-1Z'
			clipRule='evenodd'
		/>
	</svg>
);

export const MessageSVG = ({
	props,
	color,
}: {
	props?: SVGProps<SVGSVGElement>;
	color?: string;
}) => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		{...props}
	>
		<path
			fill={color}
			fillRule='evenodd'
			d='M16.127 22.2c.581.398 1.32.823 2.185 1.151 1.678.636 2.932.674 3.512.64 1.293-.073 1.467-.892.773-1.91-.792-1.16-1.555-2.473-1.48-3.926A10.953 10.953 0 0 0 23 12c0-6.075-4.925-11-11-11S1 5.925 1 12s4.925 11 11 11c1.458 0 2.851-.284 4.127-.8ZM12 3a9 9 0 0 0 0 18c1.37 0 2.665-.305 3.825-.85a1 1 0 0 1 1.034.111c.523.401 1.265.88 2.162 1.22.39.148.746.255 1.065.331-.333-.607-.67-1.33-.824-2.01-.16-.702-.4-1.924.066-2.576A8.954 8.954 0 0 0 21 12a9 9 0 0 0-9-9Z'
			clipRule='evenodd'
		/>
	</svg>
);
