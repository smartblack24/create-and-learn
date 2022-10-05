import { useMutation } from '@apollo/react-hooks';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Typography
} from '@material-ui/core';
import { useRouter } from 'next/router';
import React from 'react';
import { UrlObject } from 'url';
import { CLASSES, routeIds } from '../../shared/constants';
import { MutationArgs } from '../../types';
import { AccountContext } from '../context/account';
import { DeeplinkContext } from '../context/deeplink';
import { transformGraphqlError } from '../graphql/apollo';
import {
  SignInMutation,
  SignUpMutation,
  UserChildrenResponse
} from '../graphql/user-queries';
import {
  childNameProps,
  emailProps,
  nameProps,
  passwordProps
} from '../lib/input-fields';
import CLButton from './cl-button';
import CLTextInput from './cl-text-input';
import NextMUILink from './next-mui-link';

const Referral = 'Referral';
const Affiliate = 'Affiliate';

const sourceOptions: [string, string][] = [
  ['Newsletter', 'Newsletter'],
  ['Technews', 'Technews for Kids'],
  ['Blog', 'Blog Post'],
  ['SocialMedia', 'Facebook, Twitter, LinkedIn'],
  ['School', 'Recommended by School'],
  [Referral, 'Referred by A Friend'],
  [Affiliate, 'Affiliate Program']
];

export default function UserLogin(props: { signup: boolean }) {
  const router = useRouter();
  const account = React.useContext(AccountContext);
  const deeplink = React.useContext(DeeplinkContext);

  const [email, setEmail] = React.useState(deeplink.email || '');
  const [name, setName] = React.useState(deeplink.name || '');
  const [source, setSource] = React.useState(deeplink.source || '');
  const [password, setPassword] = React.useState('');
  const [inviter, setInviter] = React.useState('');
  const [childName, setChildName] = React.useState('');
  const [errors, setErrors] = React.useState(null);

  let redirect: UrlObject = {
    pathname: '/',
    hash: CLASSES
  };

  if (typeof router.query.next === 'string') {
    redirect = {
      pathname: router.query.next
    };
  }

  const [handleSignIn, signInResult] = useMutation<
    UserChildrenResponse,
    MutationArgs.SignIn
  >(SignInMutation, {
    onError(err) {
      setErrors(transformGraphqlError(err).details);
    },
    onCompleted(data) {
      account.setUser(data.user);
      router.replace(redirect);
    },
    variables: {
      email,
      password
    }
  });

  const [handleSignup, signupResult] = useMutation<
    UserChildrenResponse,
    MutationArgs.SignUp
  >(SignUpMutation, {
    onCompleted(data) {
      account.setUser(data.user);
      router.replace(redirect);
    },
    onError(err) {
      setErrors(transformGraphqlError(err).details);
    },
    variables: {
      email,
      name,
      source,
      inviter,
      password,
      childName,
      timezone: account.localZone
    }
  });

  if (props.signup) {
    return (
      <Box
        component="form"
        onSubmit={evt => {
          evt.preventDefault();
          setErrors(null);
          handleSignup();
        }}
      >
        <Card>
          <CardHeader title="Sign Up" subheader="Create an Account" />
          <CardContent>
            <CLTextInput
              {...emailProps}
              required={true}
              value={email}
              errors={errors}
              onChange={evt => setEmail(evt.target.value)}
            />
            <CLTextInput
              {...passwordProps}
              required={true}
              value={password}
              errors={errors}
              onChange={evt => setPassword(evt.target.value)}
            />
            <CLTextInput
              {...nameProps}
              required={true}
              value={name}
              errors={errors}
              onChange={evt => setName(evt.target.value)}
            />
            <CLTextInput
              {...childNameProps}
              value={childName}
              errors={errors}
              onChange={evt => setChildName(evt.target.value)}
            />
            <TextField
              select
              SelectProps={{
                native: true
              }}
              margin="dense"
              fullWidth
              value={source}
              onChange={evt => setSource(evt.target.value as string)}
              label="How did you hear about us?"
            >
              <option value="" />
              {sourceOptions.map(item => (
                <option key={item[0]} value={item[0]}>
                  {item[1]}
                </option>
              ))}
            </TextField>

            {source === Referral && (
              <CLTextInput
                value={inviter}
                errors={errors}
                onChange={evt => setInviter(evt.target.value)}
                name="inviter"
                helperText="Earn free classes for both of you"
                inputProps={{
                  placeholder: "referral code or your friend's email"
                }}
              />
            )}

            {source === Affiliate && (
              <CLTextInput
                value={inviter}
                errors={errors}
                onChange={evt => setInviter(evt.target.value)}
                name="inviter"
                inputProps={{
                  placeholder: 'your school affiliate code'
                }}
              />
            )}

            <Box my={2}>
              <CLButton
                color="primary"
                variant="contained"
                fullWidth
                loading={signupResult.loading}
              >
                Create Account
              </CLButton>
            </Box>
            <Typography variant="subtitle2" align="center">
              {"By signing up, you accept Create & Learn's "}
              <NextMUILink color="secondary" next={{ href: routeIds.tos }}>
                Terms of Use
              </NextMUILink>
              {' and '}
              <NextMUILink color="secondary" next={{ href: routeIds.privacy }}>
                Privacy Policy
              </NextMUILink>
              .
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      mt={6}
      mb={3}
      component="form"
      onSubmit={evt => {
        evt.preventDefault();
        setErrors(null);
        handleSignIn();
      }}
    >
      <Card>
        <CardHeader title="Sign In" subheader="Use your Create & Learn Account" />
        <CardContent>
          <CLTextInput
            {...emailProps}
            helperText="Same email you used to signup for class"
            autoFocus
            required
            errors={errors}
            value={email}
            onChange={evt => {
              setEmail(evt.target.value);
              setErrors({});
            }}
          />

          <CLTextInput
            {...passwordProps}
            label="Enter your password"
            required
            errors={errors}
            value={password}
            onChange={evt => {
              setPassword(evt.target.value);
              setErrors({});
            }}
          />
          <NextMUILink color="secondary" next={{ href: routeIds.forgotPassword }}>
            Forgot password?
          </NextMUILink>
        </CardContent>
        <Box textAlign="right" p={2}>
          <CLButton
            variant="contained"
            color="primary"
            type="submit"
            fullWidth
            loading={signInResult.loading}
          >
            Sign In
          </CLButton>
        </Box>
      </Card>
    </Box>
  );
}
