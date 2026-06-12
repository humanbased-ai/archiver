import { Button, Input } from 'react-vant'
import { faker } from '@faker-js/faker'
import { useState } from 'react'

import Toast from '@/utils/toast'

function CustomInput() {
  const [input, setInput] = useState('')

  return (
    <Input
      className="mt-3"
      placeholder="请输入"
      value={input}
      onChange={(e) => {
        console.log('input')
        setInput(e)
      }}
    ></Input>
  )
}
export function Component() {
  return (
    <div className="p-4">
      <p>{faker.lorem.paragraph(5)}</p>
      <CustomInput />
      <p className="mt-3">{faker.lorem.paragraph(5)}</p>
      <Button
        className="my-4"
        onClick={(e) => {
          Toast.info('Submit 1')
        }}
      >
        Submit 1
      </Button>
      <p>{faker.lorem.paragraph(5)}</p>
      <CustomInput />
      <p className="mt-3">{faker.lorem.paragraph(5)}</p>
      <Button
        className="my-4"
        onClick={(e) => {
          Toast.info('Submit 2')
        }}
      >
        Submit 2
      </Button>
      <p>{faker.lorem.paragraph(5)}</p>
      <CustomInput />
      <p className="mt-3">{faker.lorem.paragraph(5)}</p>
      <Button
        className="my-4"
        onClick={(e) => {
          Toast.info('Submit 3')
        }}
      >
        Submit 3
      </Button>
      <p>{faker.lorem.paragraph(5)}</p>
      <CustomInput />
      <p className="mt-3">{faker.lorem.paragraph(5)}</p>
      <Button
        className="my-4"
        onClick={(e) => {
          Toast.info('Submit 4')
        }}
      >
        Submit 4
      </Button>
    </div>
  )
}
