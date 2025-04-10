/**
 * AppConfig.ts
 *
 * Bu dosya, uygulamanın yapılandırma bilgilerini içerir.
 *
 * @key enableSplashScreen: Splash ekranının aktif olup olmadığını belirler.
 * @key enableOnboarding: Onboarding ekranının aktif olup olmadığını belirler.
 * @key enableAutoLogin: Otomatik giriş özelliğinin aktif olup olmadığını belirler.
 * @key initialRoute: Uygulamanın başlangıçta yönlendirileceği rotayı belirler.
 * @key authHomeRoute: Auth ekranının yönlendirileceği rotayı belirler.
 * @key loginRoute: Login ekranının yönlendirileceği rotayı belirler.
 * @key splashScreenDuration: Splash ekranının görüntülenme süresini belirler.
 * @key minimumLoadingTime: Uygulamanın minimum yükleme süresini belirler.
 */




/**
 * AppConfig interface
 *
 * Bu interface, uygulamanın yapılandırma bilgilerini içerir.
 */
interface AppConfig {
    features: {
        enableSplashScreen: boolean;
        enableOnboarding: boolean;
        enableAutoLogin: boolean;
    };
    routes: {
        initialRoute: string;
        authHomeRoute: string;
        loginRoute: string;
    };
    timing: {
        splashScreenDuration: number;
        minimumLoadingTime: number;
    };
}



/**
 * appConfig
 *
 * Uygulanmak istenen global yapılandırma ayarlarını içerir.
 * Örneğin Splash screen'in aktif olup olmadığı, Onboarding ekranının aktif olup olmadığı, Otomatik giriş özelliğinin aktif olup olmadığı gibi.
 * Ya da uygulama genelinde kullanılacak zamanlayıcılar gibi.
 */
export const appConfig: AppConfig = {
    features: {
        enableSplashScreen: false, // Splash screen özelliğini buradan kontrol edebilirsiniz
        enableOnboarding: true,
        enableAutoLogin: true,
    },
    routes: {
        initialRoute: 'login',
        authHomeRoute: '/(auth)/(tabs)',
        loginRoute: '/login',
    },
    timing: {
        splashScreenDuration: 2000,
        minimumLoadingTime: 500,
    },
};