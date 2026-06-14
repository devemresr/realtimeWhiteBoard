import { IoIosArrowBack } from 'react-icons/io';
import { IoIosArrowForward } from 'react-icons/io';

export default function CustomPagination({
	paginationPageNumber,
	setPaginationPageNumber,
	pageAmount,
}) {
	const paginationNumbers = [...Array(pageAmount + 1).keys()].slice(1);

	function prePage() {
		if (paginationPageNumber !== 1) {
			setPaginationPageNumber(paginationPageNumber - 1);
		}
	}

	function nextPage() {
		if (paginationPageNumber !== pageAmount) {
			setPaginationPageNumber(paginationPageNumber + 1);
		}
	}

	function changePageNumber(id) {
		setPaginationPageNumber(id);
	}
	return (
		<div className='flex gap-2 justify-center items-center mt-2'>
			<button
				onClick={prePage}
				className={`${paginationPageNumber === 1 ? 'text-gray-300' : 'text-gray-700 hover:text-purple-700'}`}
			>
				<IoIosArrowBack />
			</button>
			{paginationNumbers.map((number, index) => (
				<button
					key={index}
					className={`${paginationPageNumber === number ? 'text-purple-500' : 'text-gray-700 hover:text-purple-700'}`}
					onClick={() => changePageNumber(number)}
				>
					{number}
				</button>
			))}
			<button
				onClick={nextPage}
				className={`${paginationPageNumber === pageAmount ? 'text-gray-300' : 'text-gray-700 hover:text-purple-700'}`}
			>
				<IoIosArrowForward />
			</button>
		</div>
	);
}
