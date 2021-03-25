import { useMemo } from 'react'
import Head from 'next/head'
import { Heading, Text, VStack, Table, Thead, Tbody, Tr, Th, Td, chakra } from '@chakra-ui/react'

import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons'
import { useTable, useSortBy } from 'react-table'
import PageLayout from '../../components/PageLayout'

import { getBooksFeed, getApiSignature } from '../../lib/api'

export default function PodcastsPage ({ books, apiSignature, loadedIndexes, addLoadedIndex }) {
  // console.log({ books })
  return (
    <>
      <PageLayout
        {...{ apiSignature, loadedIndexes, addLoadedIndex }}
      >
        <Head>
          <title>Books</title>
        </Head>
        <VStack as='main' my='2rem'>
          <Heading as='h1' size='2xl' mb='2'>
            Books Listing
          </Heading>
          <Text fontSize='2xl' mt='2'>
            List of Books
          </Text>
          <BookList books={books} />
        </VStack>
      </PageLayout>
    </>
  )
}

function safeDate (dateStr) {
  try {
    const d = new Date(dateStr)
    return d.toISOString().substring(0, 10)
  } catch (err) {
    return ''
  }
}
function BookList ({ books }) {
  const data = useMemo(
    () => books
      .filter((b) => b?.userShelves !== 'to-read')
      .map((b) => ({ ...b, userReadAt: safeDate(b?.userReadAt) })),
    []
  )

  const columns = useMemo(
    () => [{
      Header: 'Title',
      accessor: 'title'
    }, {
      Header: 'Author',
      accessor: 'authorName'
    }, {
      Header: 'Read',
      accessor: 'userReadAt'
    }
    ],
    []
  )
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow
  } = useTable({ columns, data }, useSortBy)
  return (
    <Table {...getTableProps()}>
      <Thead>
        {headerGroups.map((headerGroup) => (
          // eslint-disable-next-line react/jsx-key
          <Tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column) => (
              // eslint-disable-next-line react/jsx-key
              <Th
                {...column.getHeaderProps(column.getSortByToggleProps())}
                isNumeric={column.isNumeric}
              >
                {column.render('Header')}
                <chakra.span pl='4'>
                  {column.isSorted
                    ? (column.isSortedDesc
                        ? (<TriangleDownIcon aria-label='sorted descending' />)
                        : (<TriangleUpIcon aria-label='sorted ascending' />)
                      )
                    : null}
                </chakra.span>
              </Th>
            ))}
          </Tr>
        ))}
      </Thead>
      <Tbody {...getTableBodyProps()}>
        {rows.map((row) => {
          prepareRow(row)
          return (
          // eslint-disable-next-line react/jsx-key
            <Tr {...row.getRowProps()}>
              {row.cells.map((cell) => (
                // eslint-disable-next-line react/jsx-key
                <Td {...cell.getCellProps()} isNumeric={cell.column.isNumeric}>
                  {cell.render('Cell')}
                </Td>
              ))}
            </Tr>
          )
        })}
      </Tbody>
    </Table>
  )
}

export async function getStaticProps (context) {
  const apiSignature = await getApiSignature()
  const booksFeed = await getBooksFeed()
  return {
    props: { books: booksFeed.items, apiSignature } // will be passed to the page component as props
    // revalidate: 0,
  }
}
