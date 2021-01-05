import { AccessTokenResponseClient, INVALID_TOKEN_RESPONSE_ERROR_CODE, PasswordGrantRequest } from './endpoint-protocol';
import { Component, Autowired } from '@malagu/core';
import { RestOperations } from '@malagu/web';
import { ProviderDetailsManager } from '../provider';
import { AccessTokenResponse, OAuth2ParameterNames, ClientAuthenticationMethod, OAuth2Error, OAuth2AuthorizationError, AccessTokenResponseConverter } from '@malagu/oauth2-core';
import { AuthorizationGrantRequestEntityUtil } from '../utils';
import * as qs from 'qs';

@Component()
export class PasswordTokenResponseClient implements AccessTokenResponseClient<PasswordGrantRequest> {

    @Autowired(RestOperations)
    protected readonly restOperations: RestOperations;

    @Autowired(ProviderDetailsManager)
    protected readonly providerDetailsManager: ProviderDetailsManager;

    @Autowired(AccessTokenResponseConverter)
    protected readonly accessTokenResponseConverter: AccessTokenResponseConverter;

    async getTokenResponse(passwordGrantRequest: PasswordGrantRequest): Promise<AccessTokenResponse> {
        const { clientRegistration } = passwordGrantRequest;
        const providerDetails = await this.providerDetailsManager.get(clientRegistration.provider);

        let response;
        try {
            response = await this.restOperations.post<{ [key: string]: string }>(providerDetails!.tokenUri, this.buildFormParameters(passwordGrantRequest), {
                headers: AuthorizationGrantRequestEntityUtil.getTokenRequestHeaders(clientRegistration)
            });
        } catch (error) {
            const oauth2Error = <OAuth2Error>{
                errorCode: INVALID_TOKEN_RESPONSE_ERROR_CODE,
                description: `An error occurred while attempting to retrieve the OAuth 2.0 Access Token Response: ${error?.message || error}`
            };
            throw new OAuth2AuthorizationError(oauth2Error, error);
        }

        const { data } = response;

        const acccessTokenResponse = this.accessTokenResponseConverter.convert(data);

        if (!acccessTokenResponse.accessToken.scopes || acccessTokenResponse.accessToken.scopes.length === 0) {
            // As per spec, in Section 5.1 Successful Access Token Response
            // https://tools.ietf.org/html/rfc6749#section-5.1
            // If AccessTokenResponse.scope is empty, then default to the scope
            // originally requested by the client in the Token Request
            acccessTokenResponse.accessToken.scopes = clientRegistration.scopes;
        }

        return acccessTokenResponse;
    }

    protected buildFormParameters(passwordGrantRequest: PasswordGrantRequest) {
        const { clientRegistration, authorizationGrantType, username, password } = passwordGrantRequest;
        const formParameters: { [key: string]: any } = {
            [OAuth2ParameterNames.GRANT_TYPE]: authorizationGrantType,
            [OAuth2ParameterNames.USERNAME]: username,
            [OAuth2ParameterNames.PASSWORD]: password
        };
        const { clientAuthenticationMethod, clientId, clientSecret, scopes } = clientRegistration;
        if (scopes) {
            formParameters[OAuth2ParameterNames.SCOPE] =  scopes.join(' ');
        }
        if (ClientAuthenticationMethod.Post === clientAuthenticationMethod) {
            formParameters[OAuth2ParameterNames.CLIENT_ID] = clientId;
            formParameters[OAuth2ParameterNames.CLIENT_SECRET] = clientSecret;
        }
        return qs.stringify(formParameters);
    }

}
