import { Step, StepLabel, Stepper, Typography } from '@material-ui/core';
import { ApolloError } from 'apollo-client';
import React from 'react';
import { useAlert } from 'react-alert';
import {
  applyCredit,
  applyPromo,
  getTotalPriceInCents,
  PriceBreakdown
} from '../../shared/pricing';
import { Promotion } from '../../types/common';
import { parseErrorMessage } from '../graphql/apollo';
import { ClassWithCourse } from '../graphql/data-models';
import { GetUserWithClassResponse } from '../graphql/enrollment-queries';
import { logEvent } from '../lib/analytics';

interface InputProps extends GetUserWithClassResponse {
  wholeSeries: boolean;
  children: React.ReactNode;
}

interface ContextProps {
  activeStep: number;
  handleGoNext: () => void;
  handleGoBack: () => void;
  coupon?: Promotion;
  resetCoupon: () => void;
  setCoupon: (coupon?: Promotion) => void;
  studentId: string;
  selectStudent: (studentId: string) => void;
  handleError: (err: ApolloError) => void;
  addons: ClassWithCourse[];
  isBundle: boolean;
  toggleAddon: (klass: ClassWithCourse, checked: boolean) => void;
  priceBreakdown: PriceBreakdown;
}

const defaultState: any = {};
export const CheckoutContext = React.createContext<ContextProps>(defaultState);

export function CheckoutProvider(props: InputProps) {
  const alert = useAlert();

  let defaultStudentId = '';
  for (const child of props.user.children) {
    if (props.klass.studentIds.indexOf(child.id) < 0) {
      defaultStudentId = child.id;
      break;
    }
  }

  const [activeStep, setActiveStep] = React.useState(0);
  const [studentId, selectStudent] = React.useState(defaultStudentId);
  const [coupon, setCoupon] = React.useState<Promotion>();
  const [addons, setAddons] = React.useState(
    props.wholeSeries ? props.klass.series : []
  );

  React.useEffect(() => {
    logEvent('InitiateCheckout', {
      content_name: props.klass.course.name,
      content_ids: [props.klass.courseId],
      subject: props.klass.course.subjectId
    });

    if (props.klass.course.offer) {
      setCoupon(props.klass.course.offer);
    }
  }, [props.klass]);

  const isBundle = !props.wholeSeries && addons.length > 0;
  const steps =
    props.klass.course.price > 0
      ? ['Confirm student', 'Make Payment', 'Complete']
      : ['Confirm student', 'Complete'];

  let title = props.wholeSeries
    ? `${props.klass.course.subject.name} (Units 1 - ${props.klass.course.subject.exitLevel})`
    : `${props.klass.course.name} Class`;

  if (activeStep === steps.length - 1) {
    title = `Your ${title} is Confirmed`;
  }

  return (
    <>
      <Typography color="primary" variant="h5" align="center">
        {title}
      </Typography>
      <Stepper activeStep={activeStep} style={{ margin: '2em 0' }} alternativeLabel>
        {steps.map((step, idx) => (
          <Step key={idx}>
            <StepLabel>{step}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <CheckoutContext.Provider
        value={{
          activeStep,
          handleGoBack() {
            if (activeStep > 0) {
              setActiveStep(activeStep - 1);
            }
          },
          handleGoNext() {
            if (activeStep < steps.length - 1) {
              setActiveStep(activeStep + 1);
            }
          },
          coupon,
          setCoupon,
          resetCoupon() {
            setCoupon(props.klass.course.offer);
          },
          studentId,
          selectStudent,
          handleError(err) {
            alert.error(parseErrorMessage(err), {
              timeout: 8000
            });
          },
          isBundle,
          addons,
          toggleAddon(klass, checked) {
            const filtered = addons.filter(cls => cls.id !== klass.id);
            if (checked) {
              filtered.push(klass);
            }
            setAddons(filtered);
          },
          priceBreakdown:
            props.klass.course.price === 0
              ? { price: 0, usedCredit: 0, appliedDiscount: 0 }
              : getPriceBreakdown({
                  klass: props.klass,
                  addons,
                  balanceInCents: props.user.balanceInCents,
                  promotion: coupon,
                  isBundle,
                  wholeSeries: props.wholeSeries
                })
        }}
      >
        {props.children}
      </CheckoutContext.Provider>
    </>
  );
}

// scenario 1, user buys a single class for $129
// scenario 2, user buys multiple level classes for $129 * count, this is the old upsale flow
// scenario 3, user buys the whole series for $95 * count, this is the new course price
export function getPriceBreakdown(opts: {
  klass: ClassWithCourse;
  addons: ClassWithCourse[];
  balanceInCents: number;
  promotion?: Promotion;
  isBundle: boolean;
  wholeSeries: boolean;
}): PriceBreakdown {
  let price = getTotalPriceInCents([opts.klass, ...opts.addons], {
    wholeSeries: opts.wholeSeries
  });

  let usedCredit = 0;
  let appliedDiscount = 0;

  if (price > 0 && opts.promotion) {
    const pc = applyPromo(price, opts.promotion, {
      isBundle: opts.isBundle,
      wholeSeries: opts.wholeSeries
    });
    price = pc.result;
    appliedDiscount = pc.used;
  }

  if (price > 0 && opts.balanceInCents > 0) {
    const pc = applyCredit(price, opts.balanceInCents);
    price = pc.result;
    usedCredit = pc.used;
  }

  return {
    price,
    usedCredit,
    appliedDiscount
  };
}
