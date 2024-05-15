import React, { useState } from 'react'
import styled from 'styled-components'
import { Compass } from './components/Compass'

const TopContainer = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  left: 0;
  top: 30px;
  width: 100vw;
`
const BottomContainer = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100vw;
`

export const App = () => {
  return (
    <>
      <TopContainer>
        <Compass />
      </TopContainer>
      <BottomContainer></BottomContainer>
    </>
  )
}