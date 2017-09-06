// @flow

import React, { PureComponent } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import moment from 'moment';
import Dates from './Dates';
import type Moment from 'moment';

type Props = {
  centerCurrentDate?: boolean,
  currentDate?: string | Moment,
  currentDateSelected: boolean,
  onSelectDate: (date: Moment) => any,
  showDaysAfterCurrent?: number,
  showDaysBeforeCurrent?: number,
};

type State = {
  allDatesHaveRendered: boolean,
  containerWidth: ?number,
  currentDateIndex: ?number,
  visibleMonths: ?Array<string>,
  visibleYears: ?Array<string>,
  dates: Array<Moment>,
  dayWidths: ?{| [index: number]: number |},
  scrollPositionX: number,
};

const formatMonth = (date: Moment): string => date.format('MMMM');

const formatYear = (date: Moment): string => date.format('YYYY');

export default class Calendar extends PureComponent {

  props: Props;

  static defaultProps = {
    centerCurrentDate: true,
    currentDateSelected: true,
    showDaysBeforeCurrent: 5,
    showDaysAfterCurrent: 5,
  };

  state: State;

  _scrollView;

  constructor(props: Props) {
    super(props);
    this.state = {
      // ...this.state,
      allDatesHaveRendered: false,
      containerWidth: undefined,
      currentDateIndex: props.currentDateSelected
        ? props.showDaysBeforeCurrent
        : undefined,
      dates: this.getDates(),
      dayWidths: undefined,
      visibleMonths: undefined,
      visibleYears: undefined,
      scrollPositionX: 0,
    };
  }

  // componentWillUpdate(nextProps: Props, nextState: State) {
  //   const currentDateWasChanged = this.state.currentDateIndex !== nextState.currentDateIndex;
  //   if (currentDateWasChanged) {
  //     this.updateVisibleMonthAndYear();
  //   }
  // }

  componentDidMount() {
    this.updateVisibleMonthAndYear();
  }

  // componentWillReceiveProps(nextProps: Props) {
  //   if (nextProps.currentDateIndex !== this.)
  // }

  getCurrentMonth = (): ?string => {
    const {
      dates,
      visibleMonths,
      visibleYears,
    } = this.state;

    if (!visibleMonths || !visibleYears) {
      if (dates) {
        const firstDate = dates[0];
        return `${formatMonth(firstDate)}, ${formatYear(firstDate)}`;
      }
      else {
        return undefined;
      }
    }

    // one or two months withing the same year
    else if (visibleYears.length === 1) {
      return `${visibleMonths.join(' – ')},  ${visibleYears[0]}`;
    }

    // two months within different years
    else {
      return visibleMonths
        .map((month, index) => `${month}, ${visibleYears[index]}`)
        .join(' – ');
    }
  };

  getDates = (): Array<Moment> => {
    const {
      currentDate,
      showDaysBeforeCurrent,
      showDaysAfterCurrent,
    } = this.props;

    const startDay = moment(currentDate || undefined).subtract(showDaysBeforeCurrent + 1, 'days');

    return [...Array(showDaysBeforeCurrent + showDaysAfterCurrent + 1)]
      .map(_ => startDay.add(1, 'day').clone());
  };

  scrollToCurrentDay = () => {
    const { centerCurrentDate } = this.props;
    const {
      allDatesHaveRendered,
      currentDateIndex,
      dayWidths,
      containerWidth,
    } = this.state;

    // Make sure we have all required values
    if (!allDatesHaveRendered || !containerWidth || currentDateIndex === undefined || currentDateIndex === null) {
      return;
    }

    // Put all day width values into a simple array $FlowFixMe
    const dayWidthsArray: Array<number> = Object.values(dayWidths);
    // Total width all days take
    const allDaysWidth = dayWidthsArray.reduce((total, width) => width + total, 0);
    // Current day button width
    const currentDayWidth = dayWidthsArray[currentDateIndex];
    // Minimal possible X position value to prevent scrolling before the first day
    const minX = 0;
    // Maximum possible X position value to prevent scrolling after the last day
    const maxX = allDaysWidth > containerWidth
      ? allDaysWidth - containerWidth
      : 0; // no scrolling if there's nowhere to scroll

    let scrollToX;
    let targetDayIndex = currentDateIndex;

    if (!centerCurrentDate) {
      // Target day is the one before the current one
      targetDayIndex = currentDateIndex > 1 ? currentDateIndex - 1 : 0
    }

    scrollToX = dayWidthsArray
    // get all days before the target one
      .slice(0, targetDayIndex)
      // and calculate the total width
      .reduce((total, width) => width + total, 0);

    // Adjust scroll to position if current day should be centered
    if (centerCurrentDate) {
      // Subtract half a screen width so the target day is centered
      scrollToX -= containerWidth / 2 - currentDayWidth / 2;
    }

    console.log('scrollToX', scrollToX);

    // Do not scroll over the left edge
    if (scrollToX < minX) {
      scrollToX = 0;
    }
    // Do not scroll over the right edge
    else if (scrollToX > maxX) {
      scrollToX = maxX;
    }

    console.log('scrollToX', scrollToX);
    
    this._scrollView.scrollTo({ x: scrollToX });
  };

  updateVisibleMonthAndYear = () => {

    const { allDatesHaveRendered } = this.state;

    if (!allDatesHaveRendered) {
      return;
    }

    const visibleDates = this.findVisibleDates();

    if (!visibleDates) {
      return;
    }

    let visibleMonths = [];
    let visibleYears = [];

    visibleDates.forEach((date: Moment) => {
      const month = formatMonth(date);
      const year = formatYear(date);
      if (!visibleMonths.includes(month)) {
        visibleMonths.push(month);
      }
      if (!visibleYears.includes(year)) {
        visibleYears.push(year);
      }
    });

    this.setState({
      visibleMonths,
      visibleYears,
    });
  };

  findVisibleDates = (): ?Array<Moment> => {

    const {
      containerWidth,
      dates,
      dayWidths,
      scrollPositionX,
    } = this.state;

    if (!dayWidths) {
      return;
    }
    
    let currentDatePositionX = 0;
    let firstVisibleDateIndex;
    let lastVisibleDateIndex;

    // console.log('--------------------------------------------------------');

    // $FlowFixMe
    Object.values(dayWidths).some((width: number, index: number) => {

      // console.log('index', index);
      // console.log('currentDatePositionX', currentDatePositionX);
      // console.log('scrollPositionX', scrollPositionX);
      // console.log('scrollPositionX + containerWidth', scrollPositionX + containerWidth);

      if (firstVisibleDateIndex === undefined && currentDatePositionX >= scrollPositionX) {
        // console.log('MATCH');
        firstVisibleDateIndex = index > 0 ? index - 1 : index;
      }

      if (lastVisibleDateIndex === undefined && currentDatePositionX >= scrollPositionX + containerWidth) {
        // console.log('LAST MATCH');
        lastVisibleDateIndex = index;
      }

      currentDatePositionX += width;

      // return true when both first and last visible days found to break out of loop
      return !!(firstVisibleDateIndex && lastVisibleDateIndex);
    });

    // console.log('firstVisibleDateIndex', firstVisibleDateIndex);
    // console.log('lastVisibleDateIndex', lastVisibleDateIndex);

    return dates.slice(firstVisibleDateIndex, lastVisibleDateIndex);
  };

  onLayout = (event: { nativeEvent: { layout: { x: number, y: number, width: number, height: number } } }) => {
    const { nativeEvent: { layout: { width } } } = event;
    this.setState({ containerWidth: width });
  };

  onSelectDay = (index: number) => {
    const { dates } = this.state;
    const { onSelectDate } = this.props;
    this.setState({ currentDateIndex: index }, this.scrollToCurrentDay);
    onSelectDate(dates[index]);
  };

  onRenderDay = (index: number, width: number) => {

    const { dayWidths } = this.state;
    const {
      showDaysBeforeCurrent,
      showDaysAfterCurrent,
    } = this.props;

    const allDatesHaveRendered = dayWidths
      && Object.keys(dayWidths).length >= showDaysBeforeCurrent + showDaysAfterCurrent;

    this.setState(prevState => ({
      allDatesHaveRendered,
      dayWidths: {
        ...prevState.dayWidths,
        [index]: width,
      },
    }), () => {
      if (allDatesHaveRendered) {
        this.scrollToCurrentDay();
        this.updateVisibleMonthAndYear();
      }
    });
  };

  onScroll = (event: { nativeEvent: { contentOffset: { x: number, y: number } } }) => {
    const { nativeEvent: { contentOffset: { x } } } = event;
    this.setState({ scrollPositionX: x }, this.updateVisibleMonthAndYear);
  };

  render() {

    // console.log('render');

    const {
      dates,
      currentDateIndex,
    } = this.state;

    const currentMonth = this.getCurrentMonth();

    return (
      <View onLayout={this.onLayout}>
        <View style={styles.currentMonth}>
          <Text style={styles.currentMonthText}>{currentMonth}</Text>
        </View>
        <ScrollView
          ref={scrollView => { this._scrollView = scrollView; }}
          // Horizontal scrolling
          horizontal={true}
          // Decelerate fast after the user lifts their finger
          // decelerationRate={0.1}
          // Hide all scroll indicators
          showsHorizontalScrollIndicator={false}
          // Do not adjust content automatically
          automaticallyAdjustContentInsets={false}
          // Snap interval to stop at option edges
          // snapToInterval={10}
          // style={styles.options}
          onScroll={this.onScroll}
          scrollEventThrottle={100}
        >
          <Dates
            currentDateIndex={currentDateIndex}
            dates={dates}
            onSelectDay={this.onSelectDay}
            onRenderDay={this.onRenderDay}
          />
        </ScrollView>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  currentMonth: {
    paddingHorizontal: 15,
  },
  currentMonthText: {
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'left',
  },
});